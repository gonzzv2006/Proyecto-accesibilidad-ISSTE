// Reinicia la base de la demo y carga db.inicial.json con insertMany

const MongoClient= require("mongodb").MongoClient;
const argon2=require("argon2");
const fs=require("fs");

// Función async porque cada operación de MongoClient regresa una promesa
async function cargarDatos(){
	// process.loadEnvFile lee la URL de Mongo y MongoClient se conecta
	process.loadEnvFile(".env");
	let client=new MongoClient(process.env.DB);
	await client.connect();
	let db=client.db();

	// dropDatabase borra toda la base incluidos logs y contadores
	await db.dropDatabase();

	// Lee el JSON con fs.readFileSync y recorre cada colección
	let datos=JSON.parse(fs.readFileSync("../frontend/db.inicial.json", "utf8"));
	for(let coleccion in datos){
		let registros=datos[coleccion];
		// Hash con argon2id de la contraseña de demo para cada usuario
		if(coleccion=="usuarios"){
			for(let index=0;index<registros.length; index++){
				registros[index]["password"]=await argon2.hash("sirai2026", {type: argon2.argon2id, memoryCost: 64*1024, timeCost:3, parallelism:1, saltLength:128});
			}
		}
		// insertMany con eliminado en false y createIndex único en id
		for(let index=0;index<registros.length; index++){
			registros[index]["eliminado"]=false;
		}
		await db.collection(coleccion).insertMany(registros);
		await db.collection(coleccion).createIndex({"id":1}, {"unique":true});

		// Guarda el id más alto en contadores para seguir con $inc
		let ultimo=Math.max(...registros.map((registro)=>registro.id));
		await db.collection("contadores").insertOne({"_id":coleccion, "ultimo":ultimo});
		console.log(coleccion+": "+registros.length+" registros");
	}

	// Arma los pases agrupando asistencias por grupoId y fecha
	let pases={};
	for(let index=0;index<datos["asistencias"].length; index++){
		let asistencia=datos["asistencias"][index];
		let clave=asistencia.grupoId+" "+asistencia.fecha;
		// Si la clave es nueva crea el pase con estanciaId del grupo
		if(!(clave in pases)){
			let grupo=datos["grupos"].find((g)=>g.id==asistencia.grupoId);
			pases[clave]={"grupoId":asistencia.grupoId, "estanciaId":grupo.estanciaId, "fecha":asistencia.fecha, "usuarioId":asistencia.usuarioId, "presentes":0, "ausentes":0, "pendientes":0};
		}
		// Cuenta presentes y pendientes y cualquier falta suma en ausentes
		if(asistencia.estado=="presente"){
			pases[clave].presentes++;
		}else if(asistencia.estado=="pendiente"){
			pases[clave].pendientes++;
		}else{
			pases[clave].ausentes++;
		}
	}
	// filter deja solo pases sin pendientes y los marca como cerrados
	let listaPases=Object.values(pases).filter((pase)=>pase.pendientes==0).map((pase, index)=>({
		"id":index+1, "grupoId":pase.grupoId, "estanciaId":pase.estanciaId, "fecha":pase.fecha, "usuarioId":pase.usuarioId,
		"horaCierre":new Date(pase.fecha+"T09:30:00"), "presentes":pase.presentes, "ausentes":pase.ausentes, "estado":"Cerrado", "eliminado":false
	}));
	// Inserta los pases con insertMany más índice único y su contador
	await db.collection("pases").insertMany(listaPases);
	await db.collection("pases").createIndex({"id":1}, {"unique":true});
	await db.collection("contadores").insertOne({"_id":"pases", "ultimo":listaPases.length});
	console.log("pases: "+listaPases.length+" registros");

	// createIndex con unique para no repetir usuario ni codigoQR
	await db.collection("usuarios").createIndex({"usuario":1}, {"unique":true});
	await db.collection("alumnos").createIndex({"codigoQR":1}, {"unique":true});
	// Índices únicos que ignoran eliminados y un solo seguimiento abierto por alumno
	await db.collection("asistencias").createIndex({"alumnoId":1, "fecha":1}, {"unique":true, "partialFilterExpression":{"eliminado":false}});
	await db.collection("pases").createIndex({"grupoId":1, "fecha":1}, {"unique":true, "partialFilterExpression":{"eliminado":false}});
	await db.collection("seguimientos").createIndex({"alumnoId":1}, {"unique":true, "partialFilterExpression":{"estado":"abierto", "eliminado":false}});

	// client.close cierra la conexión para que el comando termine
	await client.close();
	console.log("Datos cargados. Usuarios docente, enfermeria, admin y supervisor con contraseña sirai2026.");
}

// Ejecuta cargarDatos al correr npm run cargar
cargarDatos();
