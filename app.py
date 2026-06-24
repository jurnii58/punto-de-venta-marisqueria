import datetime
from functools import wraps
from flask import Flask, request, jsonify, render_template, send_from_directory
import bcrypt
import jwt
from bson import ObjectId

from config import Config
from database import (
    seed_database,
    users_col,
    tables_col,
    ingredients_col,
    menu_items_col,
    orders_col,
    payments_col,
    customers_col
)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config.from_object(Config)

# Inicializar y sembrar la base de datos
seed_database()

# --- HELPER DE SERIALIZACIÓN JSON ---

def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, (datetime.datetime, datetime.date)):
                new_doc[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                new_doc[k] = serialize_doc(v)
            else:
                new_doc[k] = v
        return new_doc
    return doc

# --- DECORADORES DE SEGURIDAD (MIDDLEWARES) ---

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"message": "No estás autenticado. Por favor inicia sesión para acceder."}), 401
        
        # Bypass de desarrollo para tokens simulados de la demo
        if token in ['mesero_auth_token', 'placeholder_token', 'cajero_auth_token']:
            request.user = {
                "_id": "60c72b2f9b1d8b2bad000001",
                "name": "Personal Demo",
                "username": "demo",
                "role": "Admin"
            }
            return f(*args, **kwargs)
        
        try:
            decoded = jwt.decode(token, app.config["JWT_SECRET"], algorithms=["HS256"])
            user = users_col.find_one({"_id": ObjectId(decoded["id"])})
            if not user:
                return jsonify({"message": "El usuario con el que iniciaste sesión ya no existe."}), 401
            # Sanitizar usuario
            user["_id"] = str(user["_id"])
            user.pop("password", None)
            request.user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Tu sesión ha expirado. Por favor inicia sesión nuevamente."}), 401
        except Exception:
            return jsonify({"message": "Token inválido o malformado."}), 401
        
        return f(*args, **kwargs)
    return decorated

def roles_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not getattr(request, "user", None):
                return jsonify({"message": "Error del servidor: Middleware de protección de ruta requerido antes del control de roles."}), 500
            if request.user["role"] not in roles:
                return jsonify({"message": f"Acceso denegado. Tu rol ({request.user['role']}) no tiene permisos para realizar esta acción."}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# --- SERVICIOS DE IMPRESIÓN SIMULADA (ESC/POS) ---

def print_kitchen_ticket(order, new_items):
    try:
        # Encontrar la mesa
        table_num = "S/N"
        table_cap = 0
        table_doc = tables_col.find_one({"_id": ObjectId(order["table"])})
        if table_doc:
            table_num = table_doc.get("number", "S/N")
            table_cap = table_doc.get("capacity", 0)
            
        # Agrupar items nuevos por area de preparacion
        items_by_area = {}
        for item in new_items:
            area = item.get("area", "Cocina Caliente")
            if area not in items_by_area:
                items_by_area[area] = []
            items_by_area[area].append(item)
            
        for area, items in items_by_area.items():
            print("========================================")
            print("=== SIMULADOR IMPRESORA TÉRMICA (80mm) ===")
            print(f"=== ÁREA: {area.upper()} ===")
            print("========================================")
            print("       MARISQUERÍA EL TÍO PERRO")
            print("        TICKET DE PREPARACIÓN")
            print("----------------------------------------")
            print(f"Mesa: {table_num:<8} Capacidad: {table_cap} pax")
            print(f"Folio: {str(order['_id'])[-6:].upper()}")
            print(f"Fecha: {datetime.datetime.now().strftime('%d/%m/%Y, %I:%M:%S %p')}")
            print("----------------------------------------")
            print("CANT  PLATILLO / DETALLES")
            print("----------------------------------------")
            for item in items:
                mi_name = "Platillo"
                mi_doc = menu_items_col.find_one({"_id": ObjectId(item["menuItem"])})
                if mi_doc:
                    mi_name = mi_doc.get("name", "Platillo")
                print(f"{item['quantity']:<5} {mi_name.upper()}")
                if item.get("notes"):
                    print(f"  * NOTA: {item['notes']}")
            print("----------------------------------------")
            print("          --- EN COLA ---")
            print("========================================")
            print()
    except Exception as e:
        print(f"Fallo en simulador de impresora de cocina: {str(e)}")

def print_receipt_ticket(order, payment, change, remaining, customer, user):
    try:
        table_num = "S/N"
        table_doc = tables_col.find_one({"_id": ObjectId(order["table"])})
        if table_doc:
            table_num = table_doc.get("number", "S/N")
            
        cajero_name = user.get("name", "Cajero") if user else "Cajero"
        
        print("========================================")
        print("=== SIMULADOR IMPRESORA TÉRMICA (80mm) ===")
        print("=== TICKET DE VENTA (80mm) ===")
        print("========================================")
        print("       MARISQUERÍA EL TÍO PERRO")
        print("         TICKET DE CONSUMO")
        print("----------------------------------------")
        print(f"Folio Pago: {str(payment['_id'])[-6:].upper()}")
        print(f"Fecha: {datetime.datetime.now().strftime('%d/%m/%Y, %I:%M:%S %p')}")
        print(f"Mesa: {table_num}")
        print(f"Cajero: {cajero_name}")
        print("----------------------------------------")
        print("CANT  PLATILLO                 PRECIO")
        print("----------------------------------------")
        for item in order.get("items", []):
            mi_name = "Platillo"
            mi_price = 0.0
            mi_doc = menu_items_col.find_one({"_id": ObjectId(item["menuItem"])})
            if mi_doc:
                mi_name = mi_doc.get("name", "Platillo")
                mi_price = mi_doc.get("price", 0.0)
            subtotal = mi_price * item["quantity"]
            print(f"{item['quantity']:<5} {mi_name[:20]:<22} ${subtotal:>6.2f}")
        print("----------------------------------------")
        print(f"TOTAL VENTA:                    ${order.get('total', 0.0):>6.2f}")
        print(f"MONTO PAGADO:                   ${payment.get('amount', 0.0):>6.2f}")
        print(f"MÉTODO:                         {payment.get('method', 'efectivo').upper()}")
        print(f"CAMBIO (VUELTO):                ${change:>6.2f}")
        print(f"SALDO RESTANTE:                 ${remaining:>6.2f}")
        
        if customer:
            print("----------------------------------------")
            print("       LEALTAD CLIENTE FRECUENTE")
            print(f"Cliente: {customer.get('name', 'Cliente')}")
            points_earned = int(payment.get('amount', 0.0) * 0.10)
            print(f"Puntos Ganados Hoy: {points_earned} pts")
            print(f"Puntos Acumulados: {customer.get('loyaltyPoints', 0)} pts")
            
        print("----------------------------------------")
        print("        ¡Gracias por su visita!")
        print("       MARISQUERÍA EL TÍO PERRO")
        print("========================================")
        print()
    except Exception as e:
        print(f"Fallo en simulador de impresora de caja: {str(e)}")

# --- UTILERÍAS DE APOYO ---

def populate_order(order):
    if not order:
        return None
    order = dict(order)
    order_id = order['_id']
    
    # Calcular pagos y saldos
    past_payments = list(payments_col.find({"order": order_id}))
    total_paid = sum(p.get('amount', 0.0) for p in past_payments)
    order['totalPaid'] = total_paid
    order['remaining'] = max(0.0, order.get('total', 0.0) - total_paid)
    
    # Populate Table
    if 'table' in order and order['table']:
        table_doc = tables_col.find_one({"_id": ObjectId(order['table'])})
        if table_doc:
            table_doc['_id'] = str(table_doc['_id'])
            order['table'] = table_doc
            
    # Populate items.menuItem
    if 'items' in order and isinstance(order['items'], list):
        for item in order['items']:
            if 'menuItem' in item and item['menuItem']:
                mi_doc = menu_items_col.find_one({"_id": ObjectId(item['menuItem'])})
                if mi_doc:
                    mi_doc['_id'] = str(mi_doc['_id'])
                    item['menuItem'] = mi_doc
                    
    order['_id'] = str(order['_id'])
    return order

# --- RUTAS DE NAVEGACIÓN Y PLANTILLAS ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

# Servir sw.js en la raíz para ámbito PWA completo
@app.route('/sw.js')
def serve_sw():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

# --- RUTAS API: AUTENTICACIÓN ---

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"message": "Usuario y contraseña son requeridos."}), 400
        
    user = users_col.find_one({"username": username})
    if not user:
        return jsonify({"message": "Credenciales incorrectas."}), 401
        
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({"message": "Credenciales incorrectas."}), 401
        
    token = jwt.encode({
        "id": str(user["_id"]),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }, app.config["JWT_SECRET"], algorithm="HS256")
    
    user_data = {
        "_id": str(user["_id"]),
        "name": user["name"],
        "username": user["username"],
        "role": user["role"]
    }
    
    return jsonify({"token": token, "user": user_data})

@app.route('/api/auth/users', methods=['GET'])
@token_required
@roles_required('Admin')
def get_staff_users():
    users = list(users_col.find({}, {"password": 0}).sort([("role", 1), ("name", 1)]))
    return jsonify(serialize_doc(users))

@app.route('/api/auth/register', methods=['POST'])
@token_required
@roles_required('Admin')
def register_user():
    data = request.json or {}
    name = data.get('name')
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'Mesero')
    
    if not name or not username or not password:
        return jsonify({"message": "Nombre, usuario y contraseña son obligatorios."}), 400
        
    existing = users_col.find_one({"username": username})
    if existing:
        return jsonify({"message": "El nombre de usuario ya está registrado."}), 400
        
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "name": name,
        "username": username,
        "password": hashed,
        "role": role,
        "createdAt": datetime.datetime.now(),
        "updatedAt": datetime.datetime.now()
    }
    
    users_col.insert_one(new_user)
    return jsonify({"message": "Usuario registrado exitosamente."}), 201

# --- RUTAS API: MESAS ---

@app.route('/api/tables', methods=['GET'])
def get_tables():
    tables = list(tables_col.find({}).sort("number", 1))
    return jsonify(serialize_doc(tables))

@app.route('/api/tables', methods=['POST'])
@token_required
@roles_required('Admin', 'Gerente')
def create_table():
    data = request.json or {}
    number = data.get('number')
    capacity = data.get('capacity')
    
    if number is None or capacity is None:
        return jsonify({"message": "Número de mesa y capacidad son obligatorios."}), 400
        
    existing = tables_col.find_one({"number": number})
    if existing:
        return jsonify({"message": f"La mesa número {number} ya existe."}), 400
        
    new_table = {
        "number": number,
        "capacity": capacity,
        "status": "libre",
        "createdAt": datetime.datetime.now()
    }
    tables_col.insert_one(new_table)
    return jsonify(serialize_doc(new_table)), 201

@app.route('/api/tables/<int:number>/status', methods=['PATCH'])
@token_required
def update_table_status(number):
    data = request.json or {}
    new_status = data.get('status')
    
    if new_status not in ['libre', 'ocupada']:
        return jsonify({"message": "Estado de mesa inválido."}), 400
        
    table = tables_col.find_one({"number": number})
    if not table:
        return jsonify({"message": f"Mesa {number} no encontrada."}), 404
        
    # Lógica de liberación limpia (Autopago de balance pendiente)
    if new_status == 'libre':
        active_table_orders = list(orders_col.find({"table": table["_id"], "status": "abierta"}))
        for order in active_table_orders:
            # Calcular balance pendiente
            past_payments = list(payments_col.find({"order": order["_id"]}))
            total_paid = sum(p.get('amount', 0.0) for p in past_payments)
            remaining = max(0.0, order.get("total", 0.0) - total_paid)
            
            if remaining > 0:
                # Crear abono en efectivo por el total restante
                new_payment = {
                    "order": order["_id"],
                    "amount": remaining,
                    "method": "efectivo",
                    "processedBy": ObjectId(request.user["_id"]),
                    "createdAt": datetime.datetime.now()
                }
                payments_col.insert_one(new_payment)
            
            # Cerrar orden
            orders_col.update_one(
                {"_id": order["_id"]},
                {"$set": {"status": "pagada", "paymentStatus": "paid", "updatedAt": datetime.datetime.now()}}
            )
            
    # Actualizar mesa
    tables_col.update_one({"_id": table["_id"]}, {"$set": {"status": new_status}})
    return jsonify({"message": f"Mesa {number} actualizada a {new_status} con éxito."})

# --- RUTAS API: COMANDAS (ORDERS) ---

@app.route('/api/orders', methods=['GET'])
@token_required
def get_orders():
    # Obtener todas las órdenes e inyectar totalPaid/remaining
    orders = list(orders_col.find({}).sort("createdAt", -1))
    populated = [populate_order(o) for o in orders]
    return jsonify(serialize_doc(populated))

@app.route('/api/orders', methods=['POST'])
@token_required
def create_order():
    data = request.json or {}
    table_number = data.get('tableNumber')
    items = data.get('items', [])
    
    if table_number is None or not items:
        return jsonify({"message": "Mesa e ítems de comanda son requeridos."}), 400
        
    table = tables_col.find_one({"number": table_number})
    if not table:
        return jsonify({"message": f"La mesa número {table_number} no existe."}), 404
        
    # Buscar comanda abierta existente para añadir consumos
    order = orders_col.find_one({"table": table["_id"], "status": "abierta"})
    is_new = False
    
    if not order:
        is_new = True
        order = {
            "table": table["_id"],
            "items": [],
            "total": 0.0,
            "status": "abierta",
            "paymentStatus": "pending",
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now()
        }
        # Insertar primero para tener un _id
        res_insert = orders_col.insert_one(order)
        order["_id"] = res_insert.inserted_id
        
    incremental_total = 0.0
    newly_processed_items = []
    
    for item in items:
        menu_item = menu_items_col.find_one({"_id": ObjectId(item["menuItem"])})
        if not menu_item:
            return jsonify({"message": f"El platillo {item['menuItem']} no existe."}), 404
            
        # Enrutar según categoría
        cat = menu_item.get("category", "")
        area = "Cocina Caliente"
        if cat in ["Cocteles", "Entradas"]:
            area = "Barra Fría"
        elif cat == "Bebidas":
            area = "Bebidas"
            
        order_item = {
            "_id": ObjectId(), # ID único para el platillo
            "menuItem": menu_item["_id"],
            "quantity": int(item["quantity"]),
            "notes": item.get("notes", ""),
            "area": area,
            "status": "pendiente"
        }
        
        # Descontar insumos del inventario
        for recipe_item in menu_item.get("ingredients", []):
            ing_id = recipe_item["ingredient"]
            required_qty = recipe_item["quantity"] * int(item["quantity"])
            ingredients_col.update_one(
                {"_id": ObjectId(ing_id)},
                {"$inc": {"stock": -required_qty}}
            )
            
        order["items"].append(order_item)
        newly_processed_items.append(order_item)
        incremental_total += menu_item["price"] * int(item["quantity"])
        
    # Actualizar comanda
    new_total = order["total"] + incremental_total
    new_payment_status = "partial" if (not is_new and order.get("paymentStatus") == "paid") else order.get("paymentStatus", "pending")
    
    orders_col.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "items": order["items"],
            "total": new_total,
            "paymentStatus": new_payment_status,
            "status": "abierta",
            "updatedAt": datetime.datetime.now()
        }}
    )
    
    # Actualizar mesa
    tables_col.update_one({"_id": table["_id"]}, {"$set": {"status": "ocupada"}})
    
    # Imprimir en consola de cocina
    order_doc = orders_col.find_one({"_id": order["_id"]})
    print_kitchen_ticket(order_doc, newly_processed_items)
    
    return jsonify({
        "message": "Comanda creada con éxito y enviada a cocina." if is_new else "Consumo añadido a la comanda de la mesa.",
        "order": serialize_doc(populate_order(order_doc))
    }), 201

@app.route('/api/orders/<string:orderId>/items/<string:itemId>/status', methods=['PATCH'])
@token_required
def update_item_status(orderId, itemId):
    data = request.json or {}
    new_status = data.get('status')
    
    if new_status not in ['pendiente', 'en preparación', 'entregado', 'cancelado']:
        return jsonify({"message": "Estado de platillo inválido."}), 400
        
    # Validar que solo Admin y Gerente puedan cancelar platillos de una comanda
    if new_status == 'cancelado' and request.user.get('role') not in ['Admin', 'Gerente']:
        return jsonify({"message": "Solo el administrador o gerente pueden cancelar platillos de la comanda."}), 403
        
    order = orders_col.find_one({"_id": ObjectId(orderId)})
    if not order:
        return jsonify({"message": "Comanda no encontrada."}), 404
        
    # Localizar y cambiar estado del platillo
    items = order.get("items", [])
    found = False
    for item in items:
        if str(item.get("_id", "")) == itemId:
            # Si el estado cambia a cancelado y no estaba cancelado antes, se descuenta del total y se reintegra stock
            if new_status == 'cancelado' and item.get("status") != 'cancelado':
                menu_item = menu_items_col.find_one({"_id": ObjectId(item["menuItem"])})
                if menu_item:
                    # Reintegrar ingredientes al inventario
                    for recipe_item in menu_item.get("ingredients", []):
                        ing_id = recipe_item["ingredient"]
                        required_qty = recipe_item["quantity"] * int(item["quantity"])
                        ingredients_col.update_one(
                            {"_id": ObjectId(ing_id)},
                            {"$inc": {"stock": required_qty}}
                        )
                    # Descontar del total de la comanda
                    order["total"] = max(0.0, order.get("total", 0.0) - (menu_item["price"] * item["quantity"]))
            
            item["status"] = new_status
            found = True
            break
            
    if not found:
        return jsonify({"message": "El platillo no existe en esta comanda."}), 404
        
    orders_col.update_one(
        {"_id": ObjectId(orderId)},
        {"$set": {
            "items": items,
            "total": order.get("total", 0.0),
            "updatedAt": datetime.datetime.now()
        }}
    )
    
    fresh_order = orders_col.find_one({"_id": ObjectId(orderId)})
    return jsonify(serialize_doc(populate_order(fresh_order)))

@app.route('/api/orders/<string:id>', methods=['DELETE'])
@token_required
@roles_required('Admin', 'Gerente')
def delete_order(id):
    try:
        order = orders_col.find_one({"_id": ObjectId(id)})
        if not order:
            return jsonify({"message": "Comanda no encontrada."}), 404
            
        # Liberar la mesa asociada
        if 'table' in order and order['table']:
            tables_col.update_one({"_id": ObjectId(order['table'])}, {"$set": {"status": "libre"}})
            
        # Eliminar comanda
        orders_col.delete_one({"_id": ObjectId(id)})
        
        return jsonify({"message": "Comanda cancelada y mesa liberada con éxito."})
    except Exception as e:
        return jsonify({"message": "Error al cancelar la comanda.", "error": str(e)}), 500

# --- RUTAS API: PAGOS (PAYMENTS) ---

@app.route('/api/payments', methods=['POST'])
@token_required
def process_payment():
    data = request.json or {}
    order_id = data.get('orderId')
    amount = data.get('amount')
    method = data.get('method')
    customer_id = data.get('customerId')
    
    if not order_id or amount is None or not method:
        return jsonify({"message": "Campos obligatorios: orderId, amount, method."}), 400
        
    order = orders_col.find_one({"_id": ObjectId(order_id)})
    if not order:
        return jsonify({"message": "Comanda no encontrada."}), 404
        
    if order.get("status") == "pagada" or order.get("paymentStatus") == "paid":
        return jsonify({"message": "Esta comanda ya ha sido pagada en su totalidad."}), 400
        
    # Calcular pagos previos
    past_payments = list(payments_col.find({"order": ObjectId(order_id)}))
    total_paid_so_far = sum(p.get("amount", 0.0) for p in past_payments)
    
    remaining = max(0.0, order.get("total", 0.0) - total_paid_so_far)
    if remaining <= 0:
        return jsonify({"message": "La comanda ya está totalmente cubierta."}), 400
        
    actual_payment_amount = float(amount)
    change = 0.0
    
    if actual_payment_amount > remaining:
        change = actual_payment_amount - remaining
        actual_payment_amount = remaining
        
    # Crear registro de pago
    new_payment = {
        "order": ObjectId(order_id),
        "amount": actual_payment_amount,
        "method": method,
        "processedBy": ObjectId(request.user["_id"]),
        "createdAt": datetime.datetime.now()
    }
    res_insert = payments_col.insert_one(new_payment)
    new_payment["_id"] = res_insert.inserted_id
    
    # Procesar programa de lealtad
    customer = None
    if customer_id:
        points_earned = int(actual_payment_amount * 0.10)
        customers_col.update_one(
            {"_id": ObjectId(customer_id)},
            {"$inc": {"loyaltyPoints": points_earned, "visitCount": 1}}
        )
        customer = customers_col.find_one({"_id": ObjectId(customer_id)})
        
    # Actualizar estado de comanda
    new_total_paid = total_paid_so_far + actual_payment_amount
    new_payment_status = "partial"
    new_order_status = "abierta"
    
    if new_total_paid >= order.get("total", 0.0):
        new_payment_status = "paid"
        new_order_status = "pagada"
        
        # Liberar mesa automáticamente
        tables_col.update_one({"_id": ObjectId(order["table"])}, {"$set": {"status": "libre"}})
        
    orders_col.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"paymentStatus": new_payment_status, "status": new_order_status, "updatedAt": datetime.datetime.now()}}
    )
    
    # Imprimir ticket de cobro en consola
    fresh_order = orders_col.find_one({"_id": ObjectId(order_id)})
    print_receipt_ticket(
        fresh_order, 
        new_payment, 
        change, 
        max(0.0, fresh_order.get("total", 0.0) - new_total_paid), 
        customer, 
        request.user
    )
    
    return jsonify({
        "message": "Comanda totalmente pagada." if new_payment_status == "paid" else "Pago parcial registrado con éxito.",
        "payment": serialize_doc(new_payment),
        "change": round(change, 2),
        "remaining": round(max(0.0, fresh_order.get("total", 0.0) - new_total_paid), 2)
    }), 201

@app.route('/api/payments/order/<string:orderId>', methods=['GET'])
@token_required
def get_payments_by_order(orderId):
    payments = list(payments_col.find({"order": ObjectId(orderId)}))
    populated = []
    for p in payments:
        p = dict(p)
        p['_id'] = str(p['_id'])
        p['order'] = str(p['order'])
        if 'processedBy' in p:
            user = users_col.find_one({"_id": ObjectId(p['processedBy'])}, {"password": 0})
            if user:
                user['_id'] = str(user['_id'])
                p['processedBy'] = user
        populated.append(p)
    return jsonify(serialize_doc(populated))

# --- RUTAS API: INVENTARIO (INGREDIENTS) ---

@app.route('/api/ingredients', methods=['GET'])
@token_required
def get_ingredients():
    ings = list(ingredients_col.find({}).sort("name", 1))
    return jsonify(serialize_doc(ings))

@app.route('/api/ingredients', methods=['POST'])
@token_required
@roles_required('Admin', 'Gerente')
def create_ingredient():
    data = request.json or {}
    name = data.get('name')
    stock = data.get('stock')
    unit = data.get('unit')
    min_stock = data.get('minStock', 0.0)
    
    if not name or stock is None or not unit:
        return jsonify({"message": "Nombre, stock inicial y unidad son obligatorios."}), 400
        
    new_ing = {
        "name": name,
        "stock": float(stock),
        "unit": unit,
        "minStock": float(min_stock),
        "createdAt": datetime.datetime.now()
    }
    ingredients_col.insert_one(new_ing)
    return jsonify(serialize_doc(new_ing)), 201

@app.route('/api/ingredients/<string:id>/stock', methods=['PATCH'])
@token_required
@roles_required('Admin', 'Gerente')
def adjust_ingredient_stock(id):
    data = request.json or {}
    quantity = data.get('quantity')
    
    if quantity is None:
        return jsonify({"message": "La cantidad a ajustar es requerida."}), 400
        
    res = ingredients_col.update_one(
        {"_id": ObjectId(id)},
        {"$inc": {"stock": float(quantity)}}
    )
    if res.matched_count == 0:
        return jsonify({"message": "Insumo no encontrado."}), 404
        
    fresh = ingredients_col.find_one({"_id": ObjectId(id)})
    return jsonify(serialize_doc(fresh))

# --- RUTAS API: MENÚ (MENU ITEMS) ---

@app.route('/api/menu-items', methods=['GET'])
def get_menu_items():
    items = list(menu_items_col.find({}))
    # Populate ingredients in recipes
    populated = []
    for item in items:
        item = dict(item)
        item['_id'] = str(item['_id'])
        if 'ingredients' in item and isinstance(item['ingredients'], list):
            for ing in item['ingredients']:
                ing_doc = ingredients_col.find_one({"_id": ObjectId(ing['ingredient'])})
                if ing_doc:
                    ing_doc['_id'] = str(ing_doc['_id'])
                    ing['ingredient'] = ing_doc
        populated.append(item)
    return jsonify(serialize_doc(populated))

@app.route('/api/menu-items', methods=['POST'])
@token_required
@roles_required('Admin', 'Gerente')
def create_menu_item():
    data = request.json or {}
    name = data.get('name')
    description = data.get('description')
    price = data.get('price')
    category = data.get('category')
    ingredients_list = data.get('ingredients', [])
    
    if not name or price is None or not category:
        return jsonify({"message": "Nombre, precio y categoría son requeridos."}), 400
        
    # Guardar ids de ingredientes como ObjectId
    formatted_ingredients = []
    for ing in ingredients_list:
        formatted_ingredients.append({
            "ingredient": ObjectId(ing["ingredient"]),
            "quantity": float(ing["quantity"])
        })
        
    new_item = {
        "name": name,
        "description": description or "",
        "price": float(price),
        "category": category,
        "ingredients": formatted_ingredients,
        "createdAt": datetime.datetime.now()
    }
    menu_items_col.insert_one(new_item)
    return jsonify(serialize_doc(new_item)), 201

# --- RUTAS API: CLIENTES (CUSTOMERS) ---

@app.route('/api/customers', methods=['GET'])
@token_required
def get_customers():
    custs = list(customers_col.find({}).sort("name", 1))
    return jsonify(serialize_doc(custs))

@app.route('/api/customers', methods=['POST'])
@token_required
def create_customer():
    data = request.json or {}
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    
    if not name or not phone:
        return jsonify({"message": "Nombre y teléfono son obligatorios."}), 400
        
    existing = customers_col.find_one({"phone": phone})
    if existing:
        return jsonify({"message": "Este teléfono ya está registrado para otro cliente."}), 400
        
    new_cust = {
        "name": name,
        "phone": phone,
        "email": email or "",
        "loyaltyPoints": 0,
        "visitCount": 0,
        "createdAt": datetime.datetime.now()
    }
    customers_col.insert_one(new_cust)
    return jsonify(serialize_doc(new_cust)), 201

# --- RUTAS API: DASHBOARD (STATS) ---

@app.route('/api/dashboard/stats', methods=['GET'])
@token_required
@roles_required('Admin')
def get_dashboard_stats():
    now = datetime.datetime.now()
    start_of_today = datetime.datetime(now.year, now.month, now.day, 0, 0, 0, 0)
    end_of_today = datetime.datetime(now.year, now.month, now.day, 23, 59, 59, 999999)
    
    # Sumar todos los pagos de hoy
    today_sales_data = list(payments_col.aggregate([
        {
            "$match": {
                "createdAt": { "$gte": start_of_today, "$lte": end_of_today }
            }
        },
        {
            "$group": {
                "_id": None,
                "totalRevenue": { "$sum": "$amount" },
                "transactionsCount": { "$sum": 1 }
            }
        }
    ]))
    
    today_sales = today_sales_data[0]["totalRevenue"] if today_sales_data else 0.0
    transactions = today_sales_data[0]["transactionsCount"] if today_sales_data else 0
    
    # Top 3 platillos semanal
    seven_days_ago = now - datetime.timedelta(days=7)
    top_dishes = list(orders_col.aggregate([
        {
            "$match": {
                "createdAt": { "$gte": seven_days_ago },
                "status": { "$ne": "cancelada" }
            }
        },
        { "$unwind": "$items" },
        {
            "$group": {
                "_id": "$items.menuItem",
                "quantitySold": { "$sum": "$items.quantity" }
            }
        },
        { "$sort": { "quantitySold": -1 } },
        { "$limit": 3 },
        {
            "$lookup": {
                "from": "menuitems",
                "localField": "_id",
                "foreignField": "_id",
                "as": "details"
            }
        },
        { "$unwind": "$details" },
        {
            "$project": {
                "_id": {"$toString": "$_id"},
                "quantitySold": 1,
                "name": "$details.name",
                "price": "$details.price",
                "category": "$details.category"
            }
        }
    ]))
    
    return jsonify({
        "today": {
            "totalSales": round(today_sales, 2),
            "transactionsCount": transactions
        },
        "weeklyTopDishes": top_dishes
    })

# --- EJECUCIÓN DEL SERVIDOR ---

if __name__ == '__main__':
    # Flask corre por defecto en el host 0.0.0.0 para poder ser accedido en red local
    app.run(host='0.0.0.0', port=app.config["PORT"], debug=True)
