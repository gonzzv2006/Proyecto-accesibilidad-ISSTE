// Servidor Express de SIRAI con JWT y permisos por rol en MongoDB

// Dependencias express mongodb cors argon2 jsonwebtoken y crypto para el QR
const express=require("express");
const MongoClient= require("mongodb").MongoClient;
var cors=require("cors");
const argon2=require("argon2");
const app=express();
const jwt=require("jsonwebtoken");
const fs=require("fs");
const https=require("https");
const crypto=require("crypto");

// Puerto 3000 con db global y cors() para aceptar al frontend
const PORT=3000;
let db;
app.use(cors());
// express.json lee el body JSON de cada petición
app.use(express.json());

// Conecta con MongoClient usando process.env y guarda la base en db
async function connectToDB(){
	let client=new MongoClient(await process.env.DB);
	await client.connect();
	db=client.db();
	console.log("conectado a la base de datos");
}

// Guarda en logs con insertOne usuario rol IP navegador fecha y cambios
async function log(req, token, accion, objeto, registro, cambios){
	let nuevoLog={};
	nuevoLog["timestamp"]=new Date();
	nuevoLog["sujeto"]=token.usuario;
	nuevoLog["rol"]=token.rol;
	nuevoLog["ip"]=req.ip;
	nuevoLog["navegador"]=req.get("User-Agent");
	nuevoLog["accion"]=accion;
	nuevoLog["objeto"]=objeto;
	nuevoLog["registro"]=registro;
	if(cambios){
		nuevoLog["antes"]=cambios.antes;
		nuevoLog["despues"]=cambios.despues;
	}
	await db.collection("logs").insertOne(nuevoLog);
}

// Permisos por rol y recurso y sin la acción se responde 403
const permisos={
	// Docente lee estancias y grupos sin borrar ni ver detalle en seguimientos
	"docente":{
		"estancias":["leer"],
		"grupos":["leer"],
		"alumnos":["leer", "crear", "editar"],
		"tutores":["leer", "crear", "editar"],
		"asistencias":["leer", "crear", "editar", "marcar por QR"],
		"seguimientos":["leer"],
		"pases":["leer", "crear"],
		"credenciales":["leer"],
		"sesion":["renovar"]
	},
	// Enfermería crea y edita seguimientos con ver detalle y lee el resto
	"enfermeria":{
		"estancias":["leer"],
		"grupos":["leer"],
		"alumnos":["leer"],
		"tutores":["leer"],
		"seguimientos":["leer", "crear", "editar", "ver detalle"],
		"sesion":["renovar"]
	},
	// Supervisor puede todo incluso corregir y marcar o cerrar cualquier grupo
	"supervisor":{
		"estancias":["leer", "crear", "editar", "borrar"],
		"grupos":["leer", "crear", "editar", "borrar"],
		"alumnos":["leer", "crear", "editar", "borrar"],
		"tutores":["leer", "crear", "editar", "borrar"],
		"asistencias":["leer", "crear", "editar", "borrar", "corregir", "marcar por QR", "marcar cualquier grupo"],
		"seguimientos":["leer", "crear", "editar", "borrar", "ver detalle"],
		"pases":["leer", "crear", "editar", "borrar", "cerrar cualquier grupo"],
		"usuarios":["leer", "crear"],
		"credenciales":["leer"],
		"sesion":["renovar"]
	}
};

// includes busca la acción del rol y da false si no existe
function tienePermiso(rol, recurso, accion){
	let permisosDelRol=permisos[rol] || {};
	let acciones=permisosDelRol[recurso] || [];
	return acciones.includes(accion);
}

// Escapa los caracteres especiales para usar el texto dentro de un RegExp
function escaparTexto(texto){
	return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Convierte req.query de React Admin en un filtro para find de Mongo
function armarFiltro(query){
	let filtro={};
	for(let campo in query){
		let valor=query[campo];
		// Omite operadores con _ o $ y los campos codigoQR y eliminado
		if(campo.startsWith("_") || campo.startsWith("$") || campo=="codigoQR" || campo=="eliminado"){
			continue;
		}
		// Búsqueda q con $or y RegExp y conversión de ids y booleanos
		if(campo=="q"){
			if(valor!=""){
				let texto=new RegExp(escaparTexto(valor), "i");
				filtro["$or"]=[{"nombre":texto}, {"apellidos":texto}];
			}
		}else if(campo=="id" || campo.endsWith("Id")){
			filtro[campo]=Number(valor);
		}else if(valor=="true" || valor=="false"){
			filtro[campo]=(valor=="true");
		}else{
			filtro[campo]=valor;
		}
	}
	// Excluye lo borrado con eliminado $ne true en listas y conteos
	filtro["eliminado"]={"$ne":true};
	return filtro;
}

// Siguiente id con $inc en contadores para que no se repita
async function siguienteId(collection){
	let contador=await db.collection("contadores").findOneAndUpdate({"_id":collection}, {"$inc":{"ultimo":1}}, {"upsert":true, "returnDocument":"after"});
	return contador.ultimo;
}

// Incidencias del ISSSTE que cuentan como falta y se buscan con $in
const faltas=["ausente_justificado", "falta_injustificada", "comision_medica", "filtro_sanitario"];

// Estados de asistencia válidos pendiente presente y las faltas con concat
const estadosValidos=["pendiente", "presente"].concat(faltas);

// Causas y estados del seguimiento y causasConCandado que activan requiereAlta
const causasValidas=["SIN_CLASIFICAR", "ENF_CASA", "ACC_EXT", "PER_TUT", "NO_LOC"];
const causasConCandado=["ENF_CASA", "ACC_EXT"];
const estadosSeguimiento=["abierto", "alta"];

// Proyección que nunca devuelve _id password ni codigoQR
const ocultos={"_id":0, "password":0, "codigoQR":0};

// Campos privados del seguimiento ocultos para quien no tiene ver detalle
const camposPrivados=["notas", "causa", "fechaLlamada", "fechaRetorno"];
const ocultosSeguimiento={"_id":0, "notas":0, "causa":0, "fechaLlamada":0, "fechaRetorno":0};

// countDocuments cuenta presentes faltas y pendientes de un grupo en un día
async function contarAsistencias(grupoId, fecha){
	let presentes=await db.collection("asistencias").countDocuments({"grupoId":grupoId, "fecha":fecha, "estado":"presente", "eliminado":{"$ne":true}});
	let ausentes=await db.collection("asistencias").countDocuments({"grupoId":grupoId, "fecha":fecha, "estado":{"$in":faltas}, "eliminado":{"$ne":true}});
	let pendientes=await db.collection("asistencias").countDocuments({"grupoId":grupoId, "fecha":fecha, "estado":"pendiente", "eliminado":{"$ne":true}});
	return {"presentes":presentes, "ausentes":ausentes, "pendientes":pendientes};
}

// findOne del pase Cerrado del grupo y día o null
async function buscarPaseCerrado(grupoId, fecha){
	return await db.collection("pases").findOne({"grupoId":Number(grupoId), "fecha":fecha, "estado":"Cerrado", "eliminado":{"$ne":true}});
}

// Recuenta asistencias y actualiza con $set los totales de un pase cerrado
async function recontarPase(pase){
	let cuenta=await contarAsistencias(pase.grupoId, pase.fecha);
	await db.collection("pases").updateOne({"id":pase.id}, {"$set":{"presentes":cuenta.presentes, "ausentes":cuenta.ausentes}});
}

// findOne de un seguimiento abierto con requiereAlta que impide marcar presente
async function buscarCandado(alumnoId){
	return await db.collection("seguimientos").findOne({"alumnoId":Number(alumnoId), "estado":"abierto", "requiereAlta":true, "eliminado":{"$ne":true}});
}

// Registra el log y responde 403 con un message para el frontend
async function negarSinAlta(req, res, verifiedToken, alumnoId, registro){
	let alumno=await db.collection("alumnos").findOne({"id":Number(alumnoId)});
	let nombre=alumno?alumno.nombre+" "+alumno.apellidos:"El alumno";
	await log(req, verifiedToken, "acceso denegado: presente sin alta", "asistencias", registro);
	res.status(403).json({"motivo":"requiere alta", "alumno":nombre, "message":nombre+" requiere alta de Enfermería para ingresar."});
}

// Cada falta abre seguimiento con insertOne o se agrega con $addToSet
async function abrirSeguimientos(req, verifiedToken, grupoId, fecha){
	let conFalta=await db.collection("asistencias").find({"grupoId":grupoId, "fecha":fecha, "estado":{"$in":faltas}, "eliminado":{"$ne":true}}).toArray();
	for(let asistencia of conFalta){
		// Alumno eliminado da null en findOne y se omite con continue
		if(await db.collection("alumnos").findOne({"id":asistencia.alumnoId, "eliminado":{"$ne":true}})==null){
			continue;
		}
