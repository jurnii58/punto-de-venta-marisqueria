from pymongo import MongoClient
import bcrypt
from bson import ObjectId
from config import Config

# Conexión al cliente de MongoDB
client = MongoClient(Config.MONGODB_URI)

# Intentar obtener la base de datos por defecto del URI (si la tiene configurada), o caer a 'marisqueria'
try:
    db = client.get_default_database()
    if db is None:
        db = client['marisqueria']
except Exception:
    db = client['marisqueria']

# Definición de colecciones
users_col = db['users']
tables_col = db['tables']
ingredients_col = db['ingredients']
menu_items_col = db['menuitems']
orders_col = db['orders']
payments_col = db['payments']
customers_col = db['customers']

def seed_database():
    try:
        # 1. Sembrar Mesas
        if tables_col.count_documents({}) == 0:
            default_tables = [
                { "number": 1, "capacity": 4, "status": "libre" },
                { "number": 2, "capacity": 2, "status": "libre" },
                { "number": 3, "capacity": 6, "status": "ocupada" },
                { "number": 4, "capacity": 4, "status": "libre" },
                { "number": 5, "capacity": 8, "status": "ocupada" },
                { "number": 6, "capacity": 4, "status": "libre" }
            ]
            tables_col.insert_many(default_tables)
            print("Base de Datos: 6 mesas iniciales insertadas.")

        # 2. Sembrar Insumos e Menú
        if ingredients_col.count_documents({}) == 0:
            default_ingredients = [
                { "name": "Camarón", "stock": 50.0, "unit": "kg", "minStock": 5.0 },
                { "name": "Pulpo", "stock": 30.0, "unit": "kg", "minStock": 3.0 },
                { "name": "Limón", "stock": 25.0, "unit": "kg", "minStock": 2.0 },
                { "name": "Cerveza", "stock": 120.0, "unit": "pieza", "minStock": 10.0 }
            ]
            ingredients_col.insert_many(default_ingredients)
            print("Base de Datos: Insumos iniciales insertados.")

            camaron_id = ingredients_col.find_one({"name": "Camarón"})["_id"]
            pulpo_id = ingredients_col.find_one({"name": "Pulpo"})["_id"]
            limon_id = ingredients_col.find_one({"name": "Limón"})["_id"]
            cerveza_id = ingredients_col.find_one({"name": "Cerveza"})["_id"]

            if menu_items_col.count_documents({}) == 0:
                default_menu_items = [
                    {
                        "name": "Ceviche de Camarón",
                        "description": "Ceviche fresco marinado con limón, cebolla y cilantro",
                        "price": 180.0,
                        "category": "Entradas",
                        "ingredients": [
                            { "ingredient": camaron_id, "quantity": 0.2 },
                            { "ingredient": limon_id, "quantity": 0.05 }
                        ]
                    },
                    {
                        "name": "Pulpo a las Brasas",
                        "description": "Pulpo tierno asado al carbón con aderezo de ajo",
                        "price": 280.0,
                        "category": "Especialidades",
                        "ingredients": [
                            { "ingredient": pulpo_id, "quantity": 0.25 },
                            { "ingredient": limon_id, "quantity": 0.02 }
                        ]
                    },
                    {
                        "name": "Michelada de la Casa",
                        "description": "Cerveza helada preparada con clamato y brocheta de camarón",
                        "price": 95.0,
                        "category": "Bebidas",
                        "ingredients": [
                            { "ingredient": cerveza_id, "quantity": 1.0 },
                            { "ingredient": camaron_id, "quantity": 0.05 },
                            { "ingredient": limon_id, "quantity": 0.03 }
                        ]
                    },
                    {
                        "name": "Tacos de Pescado Rebosado",
                        "description": "3 piezas de tacos estilo Ensenada con aderezo chipotle",
                        "price": 130.0,
                        "category": "Especialidades",
                        "ingredients": [
                            { "ingredient": limon_id, "quantity": 0.02 }
                        ]
                    }
                ]
                menu_items_col.insert_many(default_menu_items)
                print("Base de Datos: Menú de platillos y recetas insertado.")

        # 3. Sembrar Usuarios por defecto si no hay ninguno
        if users_col.count_documents({}) == 0:
            default_users = [
                { "name": "Administrador POS", "username": "admin", "password": "admin123", "role": "Admin" },
                { "name": "Gerente General", "username": "gerente", "password": "gerente123", "role": "Gerente" },
                { "name": "Cajero Principal", "username": "cajero", "password": "cajero123", "role": "Cajero" },
                { "name": "Mesero de Turno", "username": "mesero", "password": "mesero123", "role": "Mesero" },
                { "name": "Cocinero de Turno", "username": "cocina", "password": "cocina123", "role": "Cocina" }
            ]
            for u in default_users:
                u["password"] = bcrypt.hashpw(u["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            users_col.insert_many(default_users)
            print("Base de Datos: 5 usuarios de demostración creados.")
    except Exception as e:
        print(f"Error al inicializar la base de datos: {str(e)}")
