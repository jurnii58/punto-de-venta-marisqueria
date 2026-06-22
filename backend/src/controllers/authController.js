import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const signToken = (id) => {
  const secret = process.env.JWT_SECRET || 'secret_marisqueria_tio_perro_dev_key';
  return jwt.sign({ id }, secret, {
    expiresIn: '8h' // El token expira tras la jornada laboral promedio
  });
};

// Registrar nuevo personal
export const register = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    // Validar si el usuario ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'El nombre de usuario ya está registrado.' });
    }

    // Crear el usuario
    const newUser = await User.create({
      name,
      username,
      password,
      role
    });

    // Ocultar la contraseña
    newUser.password = undefined;

    res.status(201).json({
      message: 'Personal registrado exitosamente.',
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar el personal.', error: error.message });
  }
};

// Iniciar sesión y obtener token
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Por favor, ingresa tu usuario y contraseña.' });
    }

    // Buscar el usuario e incluir la contraseña explícitamente en la consulta
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    // Firmar token JWT
    const token = signToken(user._id);

    // Ocultar la contraseña de la respuesta
    user.password = undefined;

    res.json({
      message: 'Inicio de sesión correcto.',
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión.', error: error.message });
  }
};
