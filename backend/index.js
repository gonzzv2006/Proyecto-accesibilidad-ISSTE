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
		let abierto=await db.collection("seguimientos").findOne({"alumnoId":asistencia.alumnoId, "estado":"abierto", "eliminado":{"$ne":true}});
		if(abierto==null){
			let nuevo={"id":await siguienteId("seguimientos"), "alumnoId":asistencia.alumnoId, "grupoId":grupoId, "estado":"abierto", "fechaApertura":fecha, "fechasFalta":[fecha], "ultimaIncidencia":asistencia.estado, "causa":"SIN_CLASIFICAR", "fechaRetorno":"", "fechaLlamada":null, "notas":"", "requiereAlta":false, "usuarioId":verifiedToken.id, "eliminado":false};
			// Si insertOne choca con el índice único se suma al abierto
			try{
				await db.collection("seguimientos").insertOne(nuevo);
				await log(req, verifiedToken, "crear seguimiento automático", "seguimientos", nuevo.id);
				continue;
			}catch(error){
				if(error.code!=11000){
					throw error;
				}
				abierto=await db.collection("seguimientos").findOne({"alumnoId":asistencia.alumnoId, "estado":"abierto", "eliminado":{"$ne":true}});
			}
		}
		await db.collection("seguimientos").updateOne({"id":abierto.id}, {"$addToSet":{"fechasFalta":fecha}, "$set":{"ultimaIncidencia":asistencia.estado}});
		await log(req, verifiedToken, "sumar falta a seguimiento", "seguimientos", abierto.id);
	}
}

// Sin ver detalle se quitan campos privados de filtros _sort y proyección
function consultaDeSeguimientos(verifiedToken, req){
	let query=Object.assign({}, req.query);
	if(tienePermiso(verifiedToken.rol, "seguimientos", "ver detalle")){
		return {"proyeccion":ocultos, "query":query};
	}
	for(let campo of camposPrivados){
		delete query[campo];
	}
	if(camposPrivados.includes(query._sort)){
		query._sort="id";
	}
	return {"proyeccion":ocultosSeguimiento, "query":query};
}

// JsonWebTokenError da 401 y duplicado da 409 y lo demás 500
function manejarError(error, res){
	if(error instanceof jwt.JsonWebTokenError){
		res.sendStatus(401);
	}else if(error.code==11000){
		res.sendStatus(409);
	}else{
		console.log(error);
		res.sendStatus(500);
	}
}

// Lista de React Admin con armarFiltro y sort y paginación con slice
async function getList(collection, req, res, proyeccion=ocultos, query=req.query){
	// Ordenar por codigoQR se cambia a id para no revelar el código
	let sortBy=query._sort=="codigoQR"?"id":query._sort;
	let sortOrder=query._order=="ASC"?1:-1;
	let inicio=Number(query._start);
	let fin=Number(query._end);
	let sorter={}
	sorter[sortBy]=sortOrder;
	// id como desempate en sort para no repetir registros entre páginas
	sorter["id"]=sortOrder;
	let filtro=armarFiltro(query);
	let data=await db.collection(collection).find(filtro).sort(sorter).project(proyeccion).toArray();
	// Total en X-Total-Count expuesto con Access-Control-Expose-Headers para CORS
	res.set("Access-Control-Expose-Headers", "X-Total-Count");
	res.set("X-Total-Count", data.length);
	data=data.slice(inicio, fin);
	res.json(data);
}

// getMany busca cada id para ReferenceField sin filtrar eliminados
async function getMany(collection, req, res, proyeccion=ocultos){
	// Array.isArray asegura un arreglo aunque llegue un solo id
	let ids=Array.isArray(req.query.id)?req.query.id:[req.query.id];
	let data=[]
	for(let index=0;index<ids.length; index++){
		let dataParcial=await db.collection(collection).find({"id":Number(ids[index])}).project(proyeccion).toArray();
		data=data.concat(dataParcial);
	}
	res.json(data);
}

// getManyReference sin paginar con armarFiltro y total en X-Total-Count
async function getManyReference(collection, req, res, proyeccion=ocultos, query=req.query){
	let filtro=armarFiltro(query);
	let data=await db.collection(collection).find(filtro).project(proyeccion).toArray();
	res.set("Access-Control-Expose-Headers", "X-Total-Count");
	res.set("X-Total-Count", data.length);
	res.json(data);
}

// Busca por id sin eliminados y responde 404 si no existe
async function getOne(collection, id, req, res, proyeccion=ocultos){
	let data=await db.collection(collection).find({"id":id, "eliminado":{"$ne":true}}).project(proyeccion).toArray();
	if(data.length==0){
		res.sendStatus(404);
		return;
	}
	res.json(data[0]);
}

// Edición con $set por id y log con antes y después
async function updateData(collection, id, req, res, verifiedToken){
	let valores=req.body;
	// Quita del body los campos de borrado que solo cambia deleteData
	delete valores["eliminado"];
	delete valores["fechaEliminado"];
	delete valores["eliminadoPor"];
	valores["id"]=id;
	let antes=await db.collection(collection).findOne({"id":id, "eliminado":{"$ne":true}}, {"projection":ocultos});
	if(antes==null){
		res.sendStatus(404);
		return;
	}
	await db.collection(collection).updateOne({"id":id},{"$set":valores});
	let despues=await db.collection(collection).findOne({"id":id}, {"projection":ocultos});
	await log(req, verifiedToken, "editar", collection, id, {"antes":antes, "despues":despues});
	res.json(despues);
}

// Borrado lógico con $set marcando eliminado y 404 si no existe
async function deleteData(collection, id, req, res, verifiedToken){
	let cambio=await db.collection(collection).updateOne({"id":id, "eliminado":{"$ne":true}}, {"$set":{"eliminado":true, "fechaEliminado":new Date(), "eliminadoPor":verifiedToken.usuario}});
	if(cambio.matchedCount==0){
		res.sendStatus(404);
		return;
	}
	await log(req, verifiedToken, "borrar", collection, id);
	let data=await db.collection(collection).findOne({"id":id}, {"projection":ocultos});
	res.json(data);
}

// insertOne con siguienteId y eliminado en false y devuelve el id nuevo
async function createData(collection, req, res){
	let valores=req.body;
	valores["id"]=await siguienteId(collection);
	valores["eliminado"]=false;
	delete valores["fechaEliminado"];
	delete valores["eliminadoPor"];
	await db.collection(collection).insertOne(valores);
	let data=await db.collection(collection).find({"id":valores["id"]}).project(ocultos).toArray();
	res.json(data[0]);
	return valores["id"];
}

// GET /estancias con el molde jwt.verify tienePermiso log y operación
app.get("/estancias", async (req,res)=>{
	try{
		// Verifica el header Authentication con jwt.verify y el catch da 401
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		// Sin permiso registra acceso denegado en el log y responde 403
		if(!tienePermiso(verifiedToken.rol, "estancias", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "estancias");
			res.sendStatus(403);
			return;
		}
		// Cada consulta queda en logs como consultar datos
		await log(req, verifiedToken, "consultar datos", "estancias");
		// _sort usa getList y id usa getMany y si no getManyReference
		if("_sort" in req.query){
			await getList("estancias", req, res);
		}else if("id" in req.query){
			await getMany("estancias", req, res);
		}else{
			await getManyReference("estancias", req, res);
		}
	}catch(error){
		// manejarError responde 401 409 o 500 según el error
		manejarError(error, res);
	}
});

// GET /estancias/:id con getOne para el formulario de edición
app.get("/estancias/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "estancias", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "estancias", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "ver registro", "estancias", Number(req.params.id));
		await getOne("estancias", Number(req.params.id), req, res);
	}catch(error){
		manejarError(error, res);
	}
});

// PUT /estancias/:id con updateData y solo el supervisor puede editar
app.put("/estancias/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "estancias", "editar")){
			await log(req, verifiedToken, "acceso denegado: editar", "estancias", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await updateData("estancias", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// DELETE /estancias/:id con borrado lógico y sus grupos y alumnos se conservan
app.delete("/estancias/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "estancias", "borrar")){
			await log(req, verifiedToken, "acceso denegado: borrar", "estancias", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await deleteData("estancias", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// POST /estancias con createData y solo el supervisor puede crear
app.post("/estancias", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "estancias", "crear")){
			await log(req, verifiedToken, "acceso denegado: crear", "estancias");
			res.sendStatus(403);
			return;
		}
		// El log va después de createData porque ahí ya existe el id
		let id=await createData("estancias", req, res);
		await log(req, verifiedToken, "crear", "estancias", id);
	}catch(error){
		manejarError(error, res);
	}
});

// GET /grupos para todos los roles en pase historial y tablero
app.get("/grupos", async (req,res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "grupos", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "grupos");
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "consultar datos", "grupos");
		if("_sort" in req.query){
			await getList("grupos", req, res);
		}else if("id" in req.query){
			await getMany("grupos", req, res);
		}else{
			await getManyReference("grupos", req, res);
		}
	}catch(error){
		manejarError(error, res);
	}
});

// GET /grupos/:id con getOne para el formulario de edición
app.get("/grupos/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "grupos", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "grupos", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "ver registro", "grupos", Number(req.params.id));
		await getOne("grupos", Number(req.params.id), req, res);
	}catch(error){
		manejarError(error, res);
	}
});

// PUT /grupos/:id solo supervisor y docenteId define quién cierra el pase
app.put("/grupos/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "grupos", "editar")){
			await log(req, verifiedToken, "acceso denegado: editar", "grupos", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await updateData("grupos", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// DELETE /grupos/:id con borrado lógico solo para el supervisor
app.delete("/grupos/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "grupos", "borrar")){
			await log(req, verifiedToken, "acceso denegado: borrar", "grupos", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await deleteData("grupos", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// POST /grupos con createData solo supervisor y asigna el docente responsable
app.post("/grupos", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "grupos", "crear")){
			await log(req, verifiedToken, "acceso denegado: crear", "grupos");
			res.sendStatus(403);
			return;
		}
		let id=await createData("grupos", req, res);
		await log(req, verifiedToken, "crear", "grupos", id);
	}catch(error){
		manejarError(error, res);
	}
});

// GET /alumnos para lista buscador y pase sin exponer codigoQR
app.get("/alumnos", async (req,res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "alumnos", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "alumnos");
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "consultar datos", "alumnos");
		if("_sort" in req.query){
			await getList("alumnos", req, res);
		}else if("id" in req.query){
			await getMany("alumnos", req, res);
		}else{
			await getManyReference("alumnos", req, res);
		}
	}catch(error){
		manejarError(error, res);
	}
});

// GET /alumnos/:id con getOne y ocultos deja fuera el codigoQR
app.get("/alumnos/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "alumnos", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "alumnos", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "ver registro", "alumnos", Number(req.params.id));
		await getOne("alumnos", Number(req.params.id), req, res);
	}catch(error){
		manejarError(error, res);
	}
});

// PUT /alumnos/:id con updateData para docente y supervisor
app.put("/alumnos/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "alumnos", "editar")){
			await log(req, verifiedToken, "acceso denegado: editar", "alumnos", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		// Elimina codigoQR del body para que la credencial impresa siga válida
		delete req.body["codigoQR"];
		await updateData("alumnos", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// DELETE /alumnos/:id con borrado lógico y sus asistencias quedan en historial
app.delete("/alumnos/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "alumnos", "borrar")){
			await log(req, verifiedToken, "acceso denegado: borrar", "alumnos", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await deleteData("alumnos", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// POST /alumnos con createData para docente y supervisor
app.post("/alumnos", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "alumnos", "crear")){
			await log(req, verifiedToken, "acceso denegado: crear", "alumnos");
			res.sendStatus(403);
			return;
		}
		// codigoQR con crypto.randomUUID y no con el id para evitar falsificación
		req.body["codigoQR"]=crypto.randomUUID();
		let id=await createData("alumnos", req, res);
		await log(req, verifiedToken, "crear", "alumnos", id);
	}catch(error){
		manejarError(error, res);
	}
});

// GET /credenciales/:id único que devuelve codigoQR con Cache-Control no-store
app.get("/credenciales/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "credenciales", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "credenciales", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		let alumno=await db.collection("alumnos").findOne({"id":Number(req.params.id), "eliminado":{"$ne":true}});
		if(alumno==null || !alumno.codigoQR){
			res.sendStatus(404);
			return;
		}
		let grupo=await db.collection("grupos").findOne({"id":alumno.grupoId});
		let estancia=await db.collection("estancias").findOne({"id":alumno.estanciaId});
		await log(req, verifiedToken, "ver credencial", "alumnos", alumno.id);
		res.set("Cache-Control", "no-store");
		res.json({"id":alumno.id, "nombre":alumno.nombre, "apellidos":alumno.apellidos, "grupo":grupo?grupo.nombre:"", "estancia":estancia?estancia.nombre:"", "codigoQR":alumno.codigoQR});
	}catch(error){
		manejarError(error, res);
	}
});

// GET /tutores con getList getMany o getManyReference según la query
app.get("/tutores", async (req,res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "tutores", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "tutores");
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "consultar datos", "tutores");
		if("_sort" in req.query){
			await getList("tutores", req, res);
		}else if("id" in req.query){
			await getMany("tutores", req, res);
		}else{
			await getManyReference("tutores", req, res);
		}
	}catch(error){
		manejarError(error, res);
	}
});

// Tutor por id con getOne para editarlo y 404 si no existe
app.get("/tutores/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "tutores", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "tutores", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "ver registro", "tutores", Number(req.params.id));
		await getOne("tutores", Number(req.params.id), req, res);
	}catch(error){
		manejarError(error, res);
	}
});

// PUT de tutor con updateData que guarda los cambios con $set
app.put("/tutores/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "tutores", "editar")){
			await log(req, verifiedToken, "acceso denegado: editar", "tutores", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await updateData("tutores", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// Borrado lógico del tutor con deleteData y solo el supervisor tiene permiso
app.delete("/tutores/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "tutores", "borrar")){
			await log(req, verifiedToken, "acceso denegado: borrar", "tutores", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await deleteData("tutores", Number(req.params.id), req, res, verifiedToken);
	}catch(error){
		manejarError(error, res);
	}
});

// POST de tutor con createData permitido a docente y supervisor
app.post("/tutores", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "tutores", "crear")){
			await log(req, verifiedToken, "acceso denegado: crear", "tutores");
			res.sendStatus(403);
			return;
		}
		let id=await createData("tutores", req, res);
		await log(req, verifiedToken, "crear", "tutores", id);
	}catch(error){
		manejarError(error, res);
	}
});

// Lista de asistencias con getList o getManyReference para pase e historial
app.get("/asistencias", async (req,res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "asistencias", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "asistencias");
			res.sendStatus(403);
			return;
		}
		// Si el query trae _exportar el log registra quién bajó el CSV
		await log(req, verifiedToken, "_exportar" in req.query?"exportar":"consultar datos", "asistencias");
		if("_sort" in req.query){
			await getList("asistencias", req, res);
		}else if("id" in req.query){
			await getMany("asistencias", req, res);
		}else{
			await getManyReference("asistencias", req, res);
		}
	}catch(error){
		manejarError(error, res);
	}
});

// Una asistencia por id con getOne cuando React Admin pide un renglón
app.get("/asistencias/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "asistencias", "leer")){
			await log(req, verifiedToken, "acceso denegado: leer", "asistencias", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		await log(req, verifiedToken, "ver registro", "asistencias", Number(req.params.id));
		await getOne("asistencias", Number(req.params.id), req, res);
	}catch(error){
		manejarError(error, res);
	}
});

// PUT de asistencia con reglas de pase cerrado grupo propio y candado
app.put("/asistencias/:id", async(req, res)=>{
	try{
		let token=req.get("Authentication");
		let verifiedToken=await jwt.verify(token, await process.env.LLAVESECRETA);
		if(!tienePermiso(verifiedToken.rol, "asistencias", "editar")){
			await log(req, verifiedToken, "acceso denegado: editar", "asistencias", Number(req.params.id));
			res.sendStatus(403);
			return;
		}
		// Asistencia con findOne y 404 si falta y estado inválido da 400
		let asistencia=await db.collection("asistencias").findOne({"id":Number(req.params.id), "eliminado":{"$ne":true}});
		if(asistencia==null){
			res.sendStatus(404);
			return;
		}
		if(!estadosValidos.includes(req.body.estado)){
			res.sendStatus(400);
			return;
		}
		// Otro grupo da 403 según grupo.docenteId salvo para el supervisor
