from fastapi import FastAPI, Request, Query, Response
from fastapi.responses import JSONResponse
import mysql.connector
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Cargamos las variables ocultas del archivo .env
load_dotenv()

# Configuramos la IA con tu llave privada
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
modelo_ia = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI()

# Configuracion de conexion a TiDB
db_config = {
    "host": "gateway01.us-east-1.prod.aws.tidbcloud.com",
    "user": "4HBSXKLUs96dsK7.root",
    "password": "5CwVuuw7mWbCGuu0",
    "database": "almacen_electronica",
    "port": 4000
}

# --- RUTAS DE PRUEBA Y CONEXIÓN ---

@app.get("/")
def raiz():
    return {"mensaje": "Servidor del Sistema Experto Activo"}

@app.get("/conexion")
def probar_conexion():
    try:
        conexion = mysql.connector.connect(**db_config)
        if conexion.is_connected():
            conexion.close()
            return {"status": "success", "mensaje": "Conexion a TiDB establecida correctamente."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "mensaje": str(e)})

# --- RUTAS DE LOS AGENTES DEL SISTEMA EXPERTO ---

@app.get("/agente_inferencia/{id_pedido}")
def agente_evaluador(id_pedido: str):
    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True) 

        # 1. Leemos el pedido y cruzamos con el stock actual en TiDB
        query = """
            SELECT dp.Cantidad AS Pedida, m.Nombre, m.Cantidad AS Stock
            FROM detalle_pedido dp
            JOIN material m ON dp.FK_Material = m.ID_Material
            WHERE dp.FK_Pedido = %s
        """
        cursor.execute(query, (id_pedido,))
        materiales_solicitados = cursor.fetchall()
        
        if not materiales_solicitados:
            return {"status": "error", "mensaje": "Pedido no encontrado o no tiene materiales."}

        # 2. Variables para el Agente Supervisor (Explicabilidad)
        estado_final = "Validado OK"
        razonamiento = []

        # 3. MOTOR DE INFERENCIA: Evaluamos las reglas lógicas (Forward Chaining)
        for item in materiales_solicitados:
            if item['Pedida'] > item['Stock']:
                estado_final = "Rechazado_Infraccion"
                razonamiento.append(f"ALERTA: Se solicitaron {item['Pedida']}x '{item['Nombre']}', pero el stock actual es de {item['Stock']}.")
            else:
                razonamiento.append(f"OK: Stock suficiente para {item['Pedida']}x '{item['Nombre']}'.")

        cursor.close()
        conexion.close()

        # 4. Respuesta estructurada del Agente
        return {
            "folio_evaluado": id_pedido,
            "decision_del_agente": estado_final,
            "explicabilidad": razonamiento
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "mensaje": str(e)})
    
@app.get("/agente_nlp/{mensaje}")
def agente_atencion(mensaje: str):
    try:
        instruccion = f"""
        Eres el Agente 1 del sistema experto de almacén escolar 'SafeStock'. 
        Tu trabajo es leer el mensaje del alumno y extraer los materiales que necesita.
        Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto extra, sin saludos y sin formato markdown:
        {{"intencion": "solicitar_prestamo", "materiales": [{{"nombre": "nombre_del_material", "cantidad": numero}}]}}

        Mensaje del alumno: "{mensaje}"
        """
        
        respuesta = modelo_ia.generate_content(instruccion)
        texto_limpio = respuesta.text.replace('```json', '').replace('```', '').strip()
        datos_extraidos = json.loads(texto_limpio)
        
        return {"status": "success", "agente_1_extraccion": datos_extraidos}

    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "mensaje": str(e)})

@app.get("/procesar_chat/{mensaje}")
def procesar_mensaje_completo(mensaje: str):
    try:
        # --- FASE 1: AGENTE 1 (NLP y Extracción con Gemini) ---
        instruccion = f"""
        Eres el Agente 1 del sistema experto de almacén escolar 'SafeStock'. 
        Tu trabajo es leer el mensaje del alumno y extraer los materiales que necesita.
        Devuelve ÚNICAMENTE un JSON válido con esta estructura:
        {{"intencion": "solicitar_prestamo", "materiales": [{{"nombre": "nombre_del_material", "cantidad": numero}}]}}
        Mensaje: "{mensaje}"
        """
        respuesta_ia = modelo_ia.generate_content(instruccion)
        texto_limpio = respuesta_ia.text.replace('```json', '').replace('```', '').strip()
        datos_extraidos = json.loads(texto_limpio)

        materiales_solicitados = datos_extraidos.get("materiales", [])
        if not materiales_solicitados:
            return {"status": "error", "mensaje": "No se detectaron materiales en el mensaje."}

        # --- FASE 2: AGENTE 2 (Motor de Inferencia y TiDB) ---
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)
        
        estado_final = "Aprobado"
        razonamiento = []

        for item in materiales_solicitados:
            nombre_buscado = item["nombre"]
            cantidad_pedida = item["cantidad"]

            query = "SELECT Nombre, Cantidad AS Stock FROM material WHERE LOWER(Nombre) LIKE LOWER(%s) LIMIT 1"
            cursor.execute(query, (f"%{nombre_buscado}%",))
            resultado_db = cursor.fetchone()

            # --- FASE 3: AGENTE 3 (Explicabilidad y Reglas lógicas) ---
            if not resultado_db:
                estado_final = "Rechazado_Infraccion"
                razonamiento.append(f" ERROR: El material '{nombre_buscado}' no existe en el catálogo de electrónica.")
            else:
                stock_real = resultado_db['Stock']
                nombre_oficial = resultado_db['Nombre']
                
                if cantidad_pedida > stock_real:
                    estado_final = "Rechazado_Infraccion"
                    razonamiento.append(f" ALERTA: Pediste {cantidad_pedida}x de '{nombre_oficial}', pero solo quedan {stock_real} en almacén.")
                else:
                    razonamiento.append(f" OK: Tenemos stock para {cantidad_pedida}x de '{nombre_oficial}'.")

        cursor.close()
        conexion.close()

        return {
            "mensaje_original": mensaje,
            "decision_final": estado_final,
            "analisis_detallado": razonamiento
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "mensaje": str(e)})

# --- CONEXIÓN A WHATSAPP (WEBHOOKS) ---

# Token secreto para validar con Meta
TOKEN_VERIFICACION = "safestock_secreto_123"

# 1. RUTA DE VERIFICACIÓN (Meta la usa para validar tu servidor)
@app.get("/webhook")
def verificar_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge")
):
    if mode == "subscribe" and token == TOKEN_VERIFICACION:
        return Response(content=challenge, media_type="text/plain")
    return JSONResponse(status_code=403, content={"status": "error", "mensaje": "Token inválido"})

# 2. RUTA DE RECEPCIÓN (Aquí llegarán los mensajes reales de WhatsApp)
@app.post("/webhook")
async def recibir_mensaje_whatsapp(request: Request):
    try:
        body = await request.json()
        
        # Imprimimos en la terminal todo lo que mande WhatsApp
        print("\n=== ¡NUEVO MENSAJE DESDE WHATSAPP! ===")
        print(json.dumps(body, indent=2))
        print("=======================================\n")
        
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "mensaje": str(e)})