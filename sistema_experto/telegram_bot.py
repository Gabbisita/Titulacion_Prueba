import telebot
import requests
import json
import datetime
import unicodedata
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN_TELEGRAM = os.getenv("TOKEN_TELEGRAM")
TOKEN_GEMINI = os.getenv("TOKEN_GEMINI")
URL_API = "http://localhost:5000"

bot = telebot.TeleBot(TOKEN_TELEGRAM)
pedidos_pendientes = {}
datos_formulario = {}


def limpiar_texto(texto):
    # Pasa a minúsculas y elimina los acentos (é -> e, ó -> o)
    texto = str(texto).lower()
    return ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')

# --- AGENTE 1: NLP CON GEMINI 2.5 (Estricto y Determinista) ---
def agente_nlp_atencion(texto_cliente):
    url_gemini = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={TOKEN_GEMINI}"
    
    prompt = f"""
    Eres el Agente 1 de SafeStock. Extrae las herramientas y cantidades del mensaje.
    REGLAS ESTRICTAS E INQUEBRANTABLES:
    1. Usa SIEMPRE el nombre de la herramienta en SINGULAR (ej. "multimetro" en lugar de "multimetros", "cautin" en lugar de "cautines").
    2. Extrae solo la palabra clave principal de la herramienta.
    Devuelve ÚNICAMENTE un JSON puro (sin markdown ni comillas invertidas):
    {{"materiales": [{{"nombre": "nombre_herramienta", "cantidad": numero}}]}}
    Mensaje: "{texto_cliente}"
    """
    
    # Agregamos la configuración de temperatura para apagar la "creatividad"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0  
        }
    }
    
    try:
        respuesta = requests.post(url_gemini, headers={'Content-Type': 'application/json'}, json=payload)
        datos = respuesta.json()
        
        if 'candidates' not in datos:
            print(f"🔴 Respuesta inesperada de Google: {datos}")
            return None
            
        texto_ia = datos['candidates'][0]['content']['parts'][0]['text']
        print(f"🧠 Gemini 2.5 extrajo: {texto_ia.strip()}") 
        
        texto_limpio = texto_ia.strip().replace("```json", "").replace("```", "")
        diccionario = json.loads(texto_limpio)
        return diccionario.get("materiales", [])
        
    except Exception as e:
        print(f"🔴 Error en Agente 1: {e}")
        return None

# --- AGENTE 2: LÓGICA Y MOTOR DE INFERENCIA ---
def agente_generador_logico(peticion_limpia):
    decisiones = []
    pedido_final = []
    try:
        inventario = requests.get(f"{URL_API}/api/materiales").json()
        for item in peticion_limpia:
            nombre_original = item['nombre']
            cant = item['cantidad']
            
            # Limpiamos el nombre buscado (ej. "estación" -> "estacion")
            nombre_buscado = limpiar_texto(nombre_original)
            
            # Buscamos en la BD limpiando también el catálogo
            mat = next((m for m in inventario if nombre_buscado in limpiar_texto(m['Nombre'])), None)
            
            if not mat:
                decisiones.append(f"❌ '{nombre_original}': No encontrado en catálogo.")
                continue
                
            stock = mat['Cantidad']
            if stock == 0:
                decisiones.append(f"🚫 {mat['Nombre']}: Agotado. Sugerencia: Reabastecer.")
            elif stock < cant:
                decisiones.append(f"⚠️ {mat['Nombre']}: Aprobado parcial (tienes {stock}, querías {cant}).")
                pedido_final.append({"id": mat['ID_Material'], "cantidad": stock, "nombre": mat['Nombre']})
            else:
                decisiones.append(f"✅ {mat['Nombre']}: Aprobado total.")
                pedido_final.append({"id": mat['ID_Material'], "cantidad": cant, "nombre": mat['Nombre']})
                
        return pedido_final, decisiones
    except Exception as e:
        print(f"Error Express: {e}")
        return [], ["🔴 Error de conexión con TiDB/Express."]

# --- AGENTE 3: SUPERVISOR (NUEVA LÓGICA DE CONTROL DE FALTANTES) ---
def agente_supervisor(mensaje, pedido, decs):
    if not decs: return
    
    res = "📋 **Resumen SafeStock**\n" + "\n".join([f"- {d}" for d in decs])
    chat_id = mensaje.chat.id
    
    # NUEVO CANDADO: Buscamos si hubo algún error, advertencia o material agotado
    hay_inconvenientes = any(any(x in d for x in ["❌", "🚫", "⚠️"]) for d in decs)
    
    if pedido:
        pedidos_pendientes[chat_id] = pedido
        
        if hay_inconvenientes:
            # Si hay fallas parciales, desplegamos botones de decisión interactivos
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton("👍 Sí, continuar con lo disponible", callback_data="faltante_continuar"))
            markup.add(InlineKeyboardButton("👎 No, cancelar solicitud", callback_data="faltante_cancelar"))
            
            res += "\n\n⚠️ **Se detectaron inconvenientes con algunos elementos de tu lista.** ¿Deseas continuar con la solicitud de los materiales aprobados?"
            bot.reply_to(mensaje, res, reply_markup=markup)
        else:
            # Si todo está perfecto (puros ✅), avanza directo sin interrumpir
            res += "\n\nResponde *CONFIRMAR* para procesar el vale."
            bot.reply_to(mensaje, res)
    else:
        # Candado absoluto: si el pedido viene vacío porque nada de lo solicitado existe o hay stock
        res += "\n\n🚫 **Solicitud rechazada automáticamente:** Ninguno de los materiales solicitados está disponible en el almacén."
        bot.reply_to(mensaje, res)


# --- TELEGRAM HANDLERS ---

@bot.message_handler(commands=['start'])
def start(m): 
    bot.reply_to(m, "SafeStock listo. ¿Qué materiales ocupas?")

@bot.message_handler(func=lambda m: True)
def procesar(m):
    texto = m.text.lower().strip()
    
    # Flujo normal cuando todo está OK
    if texto == "confirmar":
        if m.chat.id in pedidos_pendientes:
            iniciar_formulario_wizard(m.chat.id, m)
        else:
            bot.reply_to(m, "No hay pedido activo.")
        return
    
    peticion = agente_nlp_atencion(m.text)
    if peticion:
        pedido, decs = agente_generador_logico(peticion)
        agente_supervisor(m, pedido, decs)
    else:
        bot.reply_to(m, "No se pudieron interpretar materiales en tu mensaje.")


# --- CALLBACKS PARA EL MANEJO DE MATERIALES FALTANTES ---

@bot.callback_query_handler(func=lambda call: call.data.startswith('faltante_'))
def manejar_faltantes(call):
    chat_id = call.message.chat.id
    
    if call.data == "faltante_continuar":
        # Quitamos los botones y avanzamos al formulario
        bot.edit_message_text("🔄 Prosiguiendo con los materiales aprobados...", chat_id, call.message.message_id)
        iniciar_formulario_wizard(chat_id, call.message)
    else:
        # Si decide cancelar, limpiamos la memoria y matamos el proceso
        if chat_id in pedidos_pendientes: 
            del pedidos_pendientes[chat_id]
        bot.edit_message_text("🚫 **Solicitud cancelada.** El vale fue descartado correctamente. Puedes realizar una nueva consulta cuando gustes.", chat_id, call.message.message_id)


# --- FUNCIONES DEL FORMULARIO INTERACTIVO (WIZARD) ---

def iniciar_formulario_wizard(chat_id, mensaje_origen):
    datos_formulario[chat_id] = {
        "materiales": pedidos_pendientes[chat_id],
        "solicitante": "23110177" 
    }
    msg = bot.send_message(chat_id, "编 ¡Perfecto! Vamos a completar tu vale paso a paso.\n\n1️⃣ **¿Cuál es el propósito o proyecto para este material?**")
    bot.register_next_step_handler(msg, preguntar_fecha)

def preguntar_fecha(m):
    datos_formulario[m.chat.id]["proposito"] = m.text
    
    markup = InlineKeyboardMarkup()
    dias_agregados = 0
    dias_a_avanzar = 1 
    
    while dias_agregados < 3: 
        d = datetime.date.today() + datetime.timedelta(days=dias_a_avanzar)
        if d.weekday() < 5: 
            fecha_str = d.strftime("%Y-%m-%d")
            markup.add(InlineKeyboardButton(f"📅 {fecha_str}", callback_data=f"fecha_{fecha_str}"))
            dias_agregados += 1
        dias_a_avanzar += 1
        
    bot.send_message(m.chat.id, "2️⃣ **Selecciona la fecha de recogida:**\n*(Mínimo un día de anticipación obligatorio)*", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data.startswith('fecha_'))
def preguntar_equipo(call):
    fecha_seleccionada = call.data.split('_')[1]
    datos_formulario[call.message.chat.id]["fecha"] = fecha_seleccionada
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("👤 Individual", callback_data="eq_indiv"))
    markup.add(InlineKeyboardButton("👥 En equipo", callback_data="eq_equipo"))
    
    bot.edit_message_text(f"✅ Fecha seleccionada: {fecha_seleccionada}\n\n3️⃣ **¿Es un trabajo en equipo?**", call.message.chat.id, call.message.message_id, reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data.startswith('eq_'))
def procesar_equipo(call):
    chat_id = call.message.chat.id
    
    if call.data == "eq_indiv":
        datos_formulario[chat_id]["integrantes"] = [{"matricula": "23110177"}]
        enviar_a_express(chat_id)
    else:
        msg = bot.edit_message_text("👥 **Trabajo en equipo**\n\nEscribe las matrículas de tus compañeros separadas por una coma.\n*(Ejemplo: 23110000, 23111111)*", chat_id, call.message.message_id)
        bot.register_next_step_handler(msg, guardar_equipo)

def guardar_equipo(m):
    chat_id = m.chat.id
    matriculas_extra = [mat.strip() for mat in m.text.split(",")]
    
    equipo = [{"matricula": "23110177"}] 
    for mat in matriculas_extra:
        equipo.append({"matricula": mat})
        
    datos_formulario[chat_id]["integrantes"] = equipo
    enviar_a_express(chat_id)

def enviar_a_express(chat_id):
    datos = datos_formulario[chat_id]
    
    payload = {
        "id_pedido": f"PED-BOT-{chat_id}-{datetime.datetime.now().strftime('%M%S')}",
        "fecha_recogida": datos["fecha"],
        "proposito": datos["proposito"],
        "solicitante": datos["solicitante"],
        "integrantes": datos["integrantes"],
        "materiales": datos["materiales"]
    }
    
    try:
        res = requests.post(f"{URL_API}/api/pedidos", json=payload)
        if res.status_code == 200:
            bot.send_message(chat_id, "✅ **¡Solicitud registrada oficialmente en SafeStock!**\nEl almacenista revisará y confirmará tu pedido.")
        else:
            bot.send_message(chat_id, f"⚠️ Backend rechazó la solicitud: {res.text}")
    except Exception as e:
        bot.send_message(chat_id, f"🔴 Error al contactar Express: {e}")
        
    if chat_id in pedidos_pendientes: del pedidos_pendientes[chat_id]
    if chat_id in datos_formulario: del datos_formulario[chat_id]


    


print("=== SISTEMA EXPERTO CORRIENDO CON GESTIÓN DE FALTANTES ===")
bot.infinity_polling()