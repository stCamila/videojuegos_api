import mongoose from "mongoose";
import * as fs from 'fs';

const esObjectIdValido = (id) => mongoose.Types.ObjectId.isValid(id);

const esquema = new mongoose.Schema({
    nombre: String,
    imagen: String,
    niveles: Number,
    fecha: Date
}, { versionKey: false });

const JuegoModel = new mongoose.model('juegos', esquema);

export const getJuegos = async (req, res) => {
    try {
        const { id } = req.params;
        const rows = id ? await JuegoModel.findById(id) : await JuegoModel.find();
        return res.status(200).json({ status: true, data: rows });
    } catch (error) {
        return res.status(500).json({ status: false, errors: [error.message] });
    }
};

export const saveJuego = async (req, res) => {
    try {
        const { nombre, niveles, fecha } = req.body;
        const validacion = validar(nombre, niveles, fecha, req.file, 'Y');
        if (validacion.length === 0) {
            const nuevoJuego = new JuegoModel({
                nombre,
                niveles,
                fecha,
                imagen: req.file ? '/uploads/' + req.file.filename : null
            });
            await nuevoJuego.save();
            return res.status(200).json({ status: true, message: 'Juego guardado' });
        } else {
            return res.status(400).json({ status: false, errors: validacion });
        }
    } catch (error) {
        return res.status(500).json({ status: false, errors: [error.message] });
    }
};

export const updateJuego = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar si el ID es un ObjectId válido
        if (!esObjectIdValido(id)) {
            return res.status(400).json({ status: false, errors: ['El ID proporcionado no es válido'] });
        }

        const { nombre, niveles, fecha } = req.body;
        let imagen = '';
        let valores = { nombre, niveles, fecha };

        if (req.file) {
            // Primero eliminar la imagen existente antes de actualizar
            const juegoExistente = await JuegoModel.findById(id);
            if (juegoExistente && juegoExistente.imagen) {
                await eliminarImagen(id);  // Eliminar la imagen antigua
            }

            imagen = '/uploads/' + req.file.filename;
            valores = { ...valores, imagen };
        }

        const validacion = validar(nombre, niveles, fecha, req.file, 'N');
        if (validacion.length === 0) {
            await JuegoModel.updateOne({ _id: id }, { $set: valores });
            return res.status(200).json({ status: true, message: 'Juego actualizado' });
        } else {
            return res.status(400).json({ status: false, errors: validacion });
        }
    } catch (error) {
        return res.status(500).json({ status: false, errors: [error.message] });
    }
};

export const deleteJuego = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar si el ID es un ObjectId válido
        if (!esObjectIdValido(id)) {
            return res.status(400).json({ status: false, errors: ['El ID proporcionado no es válido'] });
        }

        await eliminarImagen(id);
        await JuegoModel.deleteOne({ _id: id });
        return res.status(200).json({ status: true, message: 'Juego eliminado' });
    } catch (error) {
        return res.status(500).json({ status: false, errors: [error.message] });
    }
};

const eliminarImagen = async (id) => {
    const juego = await JuegoModel.findById(id);
    if (juego && juego.imagen) {
        try {
            fs.unlinkSync('./public' + juego.imagen); // Eliminar la imagen vieja
        } catch (err) {
            console.error('Error al eliminar la imagen:', err);
        }
    }
};

const validar = (nombre, niveles, fecha, img, sevalida) => {
    const errors = [];
    if (!nombre || nombre.trim() === '') {
        errors.push('El nombre NO debe de estar vacío');
    }
    if (!niveles || isNaN(niveles)) {
        errors.push('El número de niveles NO debe de estar vacío y debe ser numérico');
    }
    if (!fecha || isNaN(Date.parse(fecha))) {
        errors.push('La fecha NO debe de estar vacía y debe ser una fecha válida');
    }
    if (sevalida === 'Y' && !img) {
        errors.push('Selecciona una imagen en formato jpg o png');
    }

    return errors;
};