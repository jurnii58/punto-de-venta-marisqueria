import Customer from '../models/Customer.js';

// Obtener todos los clientes o buscar por término (nombre o teléfono)
export const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const customers = await Customer.find(query).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes.', error: error.message });
  }
};

// Registrar un nuevo cliente
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ message: 'El nombre y el teléfono son requeridos.' });
    }
    
    // Verificar si ya existe
    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: 'Ya existe un cliente registrado con ese número de teléfono.' });
    }
    
    const newCustomer = await Customer.create({
      name,
      phone,
      email
    });
    
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar cliente.', error: error.message });
  }
};
