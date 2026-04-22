"""
Agrega ejercicios OLY (oly041-oly068), rutina r20 y 10 días de
routine_exercises al workout_database.json existente.
"""
import json, pathlib, sys

DB_PATH = pathlib.Path(__file__).parent.parent / "workout_database.json"

# ── NUEVOS EJERCICIOS ────────────────────────────────────────────────────────

NEW_EXERCISES = [
  # ── Variantes técnicas principales ──────────────────────────────────────
  {
    "id": "oly041", "nombre": "Hang Squat Snatch",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "olimpico",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["gluteos", "trapecio", "deltoides", "cuadriceps"],
    "equipamiento": ["barra"], "nivel": "avanzado", "es_bilateral": True,
    "dificultad_tecnica": 5,
    "contraindicado_en": ["lumbar", "hombro", "rodilla", "muneca"]
  },
  {
    "id": "oly042", "nombre": "Pause Snatch Drop",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "tecnica",
    "musculo_principal": "deltoides",
    "musculo_secundario": ["trapecio", "cuadriceps", "core"],
    "equipamiento": ["barra"], "nivel": "intermedio", "es_bilateral": True,
    "dificultad_tecnica": 4,
    "contraindicado_en": ["hombro", "rodilla", "muneca"]
  },
  {
    "id": "oly043", "nombre": "Drop Power Clean",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "tecnica",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["trapecio", "cuadriceps", "gluteos"],
    "equipamiento": ["barra"], "nivel": "intermedio", "es_bilateral": True,
    "dificultad_tecnica": 3,
    "contraindicado_en": ["lumbar", "rodilla", "muneca"]
  },
  {
    "id": "oly044", "nombre": "Pause Power Clean",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "tecnica",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["trapecio", "gluteos", "cuadriceps"],
    "equipamiento": ["barra"], "nivel": "intermedio", "es_bilateral": True,
    "dificultad_tecnica": 4,
    "contraindicado_en": ["lumbar", "muneca"]
  },
  {
    "id": "oly045", "nombre": "Low Hang Power Clean",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "olimpico",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["trapecio", "gluteos", "cuadriceps"],
    "equipamiento": ["barra"], "nivel": "intermedio", "es_bilateral": True,
    "dificultad_tecnica": 4,
    "contraindicado_en": ["lumbar", "rodilla", "muneca"]
  },
  {
    "id": "oly046", "nombre": "Low Hang Squat Snatch",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "olimpico",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["gluteos", "trapecio", "deltoides", "cuadriceps"],
    "equipamiento": ["barra"], "nivel": "avanzado", "es_bilateral": True,
    "dificultad_tecnica": 5,
    "contraindicado_en": ["lumbar", "hombro", "rodilla", "muneca"]
  },
  {
    "id": "oly047", "nombre": "Front Push Press OLY",
    "disciplina": "oly", "patron_movimiento": "empuje_vertical", "tipo": "olimpico",
    "musculo_principal": "deltoides",
    "musculo_secundario": ["cuadriceps", "triceps", "core"],
    "equipamiento": ["barra"], "nivel": "intermedio", "es_bilateral": True,
    "dificultad_tecnica": 3,
    "contraindicado_en": ["hombro", "rodilla"]
  },
  {
    "id": "oly048", "nombre": "High Hang Power Clean",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "olimpico",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["trapecio", "gluteos"],
    "equipamiento": ["barra"], "nivel": "intermedio", "es_bilateral": True,
    "dificultad_tecnica": 3,
    "contraindicado_en": ["lumbar", "muneca"]
  },
  {
    "id": "oly049", "nombre": "High Hang Squat Snatch",
    "disciplina": "oly", "patron_movimiento": "olimpico", "tipo": "olimpico",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["gluteos", "trapecio", "deltoides"],
    "equipamiento": ["barra"], "nivel": "avanzado", "es_bilateral": True,
    "dificultad_tecnica": 5,
    "contraindicado_en": ["lumbar", "hombro", "rodilla", "muneca"]
  },
  {
    "id": "oly050", "nombre": "Tempo Clean Pull",
    "disciplina": "oly", "patron_movimiento": "bisagra", "tipo": "tecnica",
    "musculo_principal": "isquiotibiales",
    "musculo_secundario": ["gluteos", "lumbar", "trapecio"],
    "equipamiento": ["barra"], "nivel": "principiante", "es_bilateral": True,
    "dificultad_tecnica": 2,
    "contraindicado_en": ["lumbar"]
  },
  {
    "id": "oly051", "nombre": "Spanish Squat Isométrico",
    "disciplina": "oly", "patron_movimiento": "sentadilla", "tipo": "fuerza",
    "musculo_principal": "cuadriceps",
    "musculo_secundario": ["gluteos", "isquiotibiales", "tobillo"],
    "equipamiento": ["banda_elastica"], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": ["rodilla"]
  },
  {
    "id": "oly052", "nombre": "Copenhagen Plank",
    "disciplina": "oly", "patron_movimiento": "core", "tipo": "fuerza",
    "musculo_principal": "aductores",
    "musculo_secundario": ["oblicuos", "core"],
    "equipamiento": ["banco"], "nivel": "intermedio",
    "es_bilateral": False, "dificultad_tecnica": 2,
    "contraindicado_en": ["cadera", "rodilla"]
  },
  # ── Movilidad / Activación ───────────────────────────────────────────────
  {
    "id": "oly053", "nombre": "Movilidad de Tobillo OLY",
    "disciplina": "oly", "patron_movimiento": "movilidad", "tipo": "movilidad",
    "musculo_principal": "tobillo",
    "musculo_secundario": ["gemelos", "soleo"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": False, "dificultad_tecnica": 1,
    "contraindicado_en": ["tobillo"]
  },
  {
    "id": "oly054", "nombre": "Sentadilla Profunda con Pesa Rusa",
    "disciplina": "oly", "patron_movimiento": "sentadilla", "tipo": "movilidad",
    "musculo_principal": "cuadriceps",
    "musculo_secundario": ["gluteos", "tobillo", "cadera"],
    "equipamiento": ["pesa_rusa"], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": ["rodilla"]
  },
  {
    "id": "oly055", "nombre": "Rotación Torácica en Cuadrupedia",
    "disciplina": "oly", "patron_movimiento": "movilidad", "tipo": "movilidad",
    "musculo_principal": "columna_toracica",
    "musculo_secundario": ["oblicuos", "dorsal"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": False, "dificultad_tecnica": 1,
    "contraindicado_en": ["lumbar"]
  },
  {
    "id": "oly056", "nombre": "Puente de Glúteos con Pausa",
    "disciplina": "oly", "patron_movimiento": "bisagra", "tipo": "movilidad",
    "musculo_principal": "gluteos",
    "musculo_secundario": ["isquiotibiales", "lumbar"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": ["cadera"]
  },
  {
    "id": "oly057", "nombre": "Movilidad Front Rack",
    "disciplina": "oly", "patron_movimiento": "movilidad", "tipo": "movilidad",
    "musculo_principal": "muneca",
    "musculo_secundario": ["deltoides_posterior", "triceps", "latissimus"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": ["muneca"]
  },
  {
    "id": "oly058", "nombre": "Extensión Torácica en Banco",
    "disciplina": "oly", "patron_movimiento": "movilidad", "tipo": "movilidad",
    "musculo_principal": "columna_toracica",
    "musculo_secundario": ["deltoides", "dorsal"],
    "equipamiento": ["banco"], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": []
  },
  {
    "id": "oly059", "nombre": "Bicho Muerto (Dead Bug)",
    "disciplina": "oly", "patron_movimiento": "core", "tipo": "movilidad",
    "musculo_principal": "core",
    "musculo_secundario": ["lumbar", "oblicuos"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": []
  },
  {
    "id": "oly060", "nombre": "Jerk Footwork",
    "disciplina": "oly", "patron_movimiento": "movilidad", "tipo": "tecnica",
    "musculo_principal": "cuadriceps",
    "musculo_secundario": ["gluteos", "tobillo"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 2,
    "contraindicado_en": ["rodilla", "tobillo"]
  },
  {
    "id": "oly061", "nombre": "Movilidad de Cadera 90/90",
    "disciplina": "oly", "patron_movimiento": "movilidad", "tipo": "movilidad",
    "musculo_principal": "cadera",
    "musculo_secundario": ["piriforme", "aductores", "gluteos"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": False, "dificultad_tecnica": 1,
    "contraindicado_en": ["cadera"]
  },
  {
    "id": "oly062", "nombre": "Band Pull Apart",
    "disciplina": "oly", "patron_movimiento": "jale_horizontal", "tipo": "movilidad",
    "musculo_principal": "deltoides_posterior",
    "musculo_secundario": ["trapecio", "romboides"],
    "equipamiento": ["banda_elastica"], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": ["hombro"]
  },
  {
    "id": "oly063", "nombre": "Scap Push Up",
    "disciplina": "oly", "patron_movimiento": "empuje_horizontal", "tipo": "movilidad",
    "musculo_principal": "serrato",
    "musculo_secundario": ["romboides", "trapecio"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": ["hombro"]
  },
  {
    "id": "oly064", "nombre": "Jerk Dip + Drive",
    "disciplina": "oly", "patron_movimiento": "empuje_vertical", "tipo": "tecnica",
    "musculo_principal": "cuadriceps",
    "musculo_secundario": ["gluteos", "triceps", "core"],
    "equipamiento": ["barra"], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 2,
    "contraindicado_en": ["rodilla"]
  },
  {
    "id": "oly065", "nombre": "Jerk Reverse Balance",
    "disciplina": "oly", "patron_movimiento": "empuje_vertical", "tipo": "tecnica",
    "musculo_principal": "cuadriceps",
    "musculo_secundario": ["gluteos", "deltoides", "core"],
    "equipamiento": ["barra"], "nivel": "intermedio",
    "es_bilateral": True, "dificultad_tecnica": 3,
    "contraindicado_en": ["rodilla", "hombro"]
  },
  {
    "id": "oly066", "nombre": "Sentadilla Profunda Asistida",
    "disciplina": "oly", "patron_movimiento": "sentadilla", "tipo": "movilidad",
    "musculo_principal": "cuadriceps",
    "musculo_secundario": ["gluteos", "tobillo", "cadera"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": ["rodilla"]
  },
  {
    "id": "oly067", "nombre": "Sentadilla Cossack Asistida",
    "disciplina": "oly", "patron_movimiento": "sentadilla", "tipo": "movilidad",
    "musculo_principal": "aductores",
    "musculo_secundario": ["cuadriceps", "gluteos", "tobillo"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": False, "dificultad_tecnica": 2,
    "contraindicado_en": ["rodilla", "cadera"]
  },
  {
    "id": "oly068", "nombre": "Extensión Torácica en Pared",
    "disciplina": "oly", "patron_movimiento": "movilidad", "tipo": "movilidad",
    "musculo_principal": "columna_toracica",
    "musculo_secundario": ["deltoides", "dorsal"],
    "equipamiento": [], "nivel": "principiante",
    "es_bilateral": True, "dificultad_tecnica": 1,
    "contraindicado_en": []
  },
]

# ── NUEVA RUTINA ─────────────────────────────────────────────────────────────

NEW_ROUTINE = {
  "id": "r20",
  "nombre": "OLY 10 Días — Técnico-Competitivo",
  "objetivo": "tecnica_olimpica",
  "nivel": "avanzado",
  "duracion_semanas": 2,
  "frecuencia_semanal": 5,
  "genero": "unisex",
  "division": "oly_tecnico",
  "notas": "Ciclo de 10 días de levantamiento olímpico. Énfasis en variantes de posición (hang, low hang, high hang, bloques, pausa) y movilidad específica por sesión."
}

# ── ROUTINE_EXERCISES ────────────────────────────────────────────────────────

def rx(dia, orden, eid, series, reps, descanso, notas=None):
  return {"routine_id": "r20", "dia": dia, "ejercicio_id": eid,
          "orden": orden, "series": series, "reps": reps,
          "descanso_seg": descanso, "notas": notas}

NEW_ROUTINE_EXERCISES = [
  # ── DÍA 1 ──
  rx(1,1,"oly053",2,"10 c/lado",30,"con carga"),
  rx(1,2,"oly054",2,"30''",30,"rusa colgando"),
  rx(1,3,"oly055",2,"8 c/lado",30,None),
  rx(1,4,"oly056",2,"10",30,"pausa 2''"),
  rx(1,5,"oly001",16,"2",90,"(60/65/70/75kg) x4 rondas"),
  rx(1,6,"oly002",16,"1",120,"(85/90/95/100kg) x4 rondas — Clean + Jerk"),
  rx(1,7,"oly010",5,"3",120,"110kg"),
  rx(1,8,"oly038",3,"3",120,"80kg — profundo, afloja articulaciones"),

  # ── DÍA 2 ──
  rx(2,1,"oly057",2,"30''",30,None),
  rx(2,2,"oly058",2,"8",30,"profundas, pausa 2'' c/u"),
  rx(2,3,"oly059",2,"10",30,None),
  rx(2,4,"oly041",7,"2",90,"60kg x4 + 70kg x3"),
  rx(2,5,"oly042",5,"2",90,"50kg — pausa 5'' abajo, espalda activa"),
  rx(2,6,"oly009",4,"4",120,"90kg — sin levantar talón ni adelantar cadera"),

  # ── DÍA 3 ──
  rx(3,1,"oly053",2,"10 c/lado",30,None),
  rx(3,2,"oly066",2,"20''",30,None),
  rx(3,3,"oly060",3,"6",30,"pasos"),
  rx(3,4,"oly043",6,"3",90,"40kg — pausa 3'' en recepción power, casi al paralelo"),
  rx(3,5,"oly044",6,"2",90,"60kg — pausa en medio muslo, pausa 2'' antes de pararse"),
  rx(3,6,"oly004",6,"1+1",120,"90kg — Power Clean + Push Jerk. Sin despatarrar"),

  # ── DÍA 4 ──
  rx(4,1,"oly053",2,"10 c/lado",30,"en pared"),
  rx(4,2,"oly066",2,"30''",30,None),
  rx(4,3,"oly068",2,"8",30,None),
  rx(4,4,"oly056",2,"10",30,"pausa 2''"),
  rx(4,5,"oly044",6,"2",120,"60kg — + Pause Front Squat: pausa 2'' en recepción y 2'' abajo"),
  rx(4,6,"oly045",5,"2",120,"80kg — sentarse, no despatarrar"),
  rx(4,7,"oly021",3,"6",120,"70kg — 3'' bajar + 3'' subir"),
  rx(4,8,"oly051",3,"25''",60,"isométrico"),

  # ── DÍA 5 ──
  rx(5,1,"oly061",2,"6 c/lado",30,None),
  rx(5,2,"oly057",2,"30''",30,None),
  rx(5,3,"oly062",2,"15",30,None),
  rx(5,4,"oly012",6,"1",120,"65kg — pausa 10'' abajo, bien profundo"),
  rx(5,5,"oly046",7,"2",90,"65kg x2 + 70kg x2 + 75kg x3"),
  rx(5,6,"oly047",5,"3",90,"75kg — solo rodillas, empuje corto y explosivo"),
  rx(5,7,"oly010",4,"3",120,"115kg — marca extensión de rodillas, sin levantar talón"),

  # ── DÍA 6 ──
  rx(6,1,"oly053",2,"10 c/lado",30,None),
  rx(6,2,"oly063",2,"10",30,None),
  rx(6,3,"oly064",3,"3",30,"siempre 1+1"),
  rx(6,4,"oly003",10,"2",60,"60kg EMOM — 2 reps por minuto, sin despatarrar"),
  rx(6,5,"oly048",6,"2",90,"60kg — puro muslo, metida rápida, sin despatarrar"),
  rx(6,6,"oly036",6,"2",120,"90kg — sentarse, no despatarrar"),

  # ── DÍA 7 ──
  rx(7,1,"oly053",2,"10 c/lado",30,None),
  rx(7,2,"oly068",2,"8",30,None),
  rx(7,3,"oly057",2,"30''",30,None),
  rx(7,4,"oly012",2,"1",120,"60kg — pausa 10'' abajo"),
  rx(7,5,"oly037",12,"1",90,"(70/75/80/85kg) x3 rondas — desde bloques a altura de rodilla"),
  rx(7,6,"oly002",6,"varía",120,"(90x2, 100x2, 110x1) x2 rondas — Squat Clean + Jerk"),
  rx(7,7,"oly038",3,"2",120,"90kg"),

  # ── DÍA 8 ──
  rx(8,1,"oly057",2,"30''",30,None),
  rx(8,2,"oly055",2,"8 c/lado",30,None),
  rx(8,3,"oly067",2,"6 c/lado",30,None),
  rx(8,4,"oly029",9,"3",60,"30kg x3 + 35kg x3 + 40kg x3"),
  rx(8,5,"oly042",6,"2",90,"50kg — pausa 2'' en profundidad"),
  rx(8,6,"oly049",6,"2",90,"60kg — puro muslo, metida rápida, sin inclinar torso"),
  rx(8,7,"oly050",3,"3",120,"90kg — 3'' subir + 1'' pausa"),
  rx(8,8,"oly052",3,"20'' c/lado",60,None),

  # ── DÍA 9 ──
  rx(9,1,"oly053",2,"10 c/lado",30,None),
  rx(9,2,"oly066",2,"20''",30,None),
  rx(9,3,"oly065",3,"6",30,"pequeño paso atrás hasta completar"),
  rx(9,4,"oly012",2,"1",120,"60kg — pausa 10'' abajo"),
  rx(9,5,"oly003",6,"1+1",90,"Power Snatch sentado + Squat Snatch. 60kg x3, 65kg x3"),
  rx(9,6,"oly004",5,"1+1+1",120,"80kg — Power Clean sentado + Front Squat + Jerk"),
  rx(9,7,"oly004",6,"2",90,"90kg"),

  # ── DÍA 10 ──
  rx(10,1,"oly057",2,"30''",30,None),
  rx(10,2,"oly068",2,"8",30,None),
  rx(10,3,"oly056",2,"10",30,"pausa 2''"),
  rx(10,4,"oly002",12,"varía",120,"(90x2+1, 100x2+1, 110x1+1) x4 rondas — Squat Clean + Jerk"),
  rx(10,5,"oly038",3,"3",120,"90kg — pausa profunda"),
]

# ── EJECUTAR ─────────────────────────────────────────────────────────────────

def main():
  print(f"Leyendo {DB_PATH}...")
  with open(DB_PATH, encoding="utf-8") as f:
    db = json.load(f)

  # Verificar que los IDs nuevos no existen
  existing_ids = {e["id"] for e in db["exercises"]}
  for e in NEW_EXERCISES:
    if e["id"] in existing_ids:
      print(f"  SKIP (ya existe): {e['id']}")
    else:
      db["exercises"].append(e)
      print(f"  + ejercicio: {e['id']} — {e['nombre']}")

  existing_routine_ids = {r["id"] for r in db["routines"]}
  if NEW_ROUTINE["id"] in existing_routine_ids:
    print(f"  SKIP rutina (ya existe): {NEW_ROUTINE['id']}")
  else:
    db["routines"].append(NEW_ROUTINE)
    print(f"  + rutina: {NEW_ROUTINE['id']} — {NEW_ROUTINE['nombre']}")

  added_rx = 0
  for row in NEW_ROUTINE_EXERCISES:
    db["routine_exercises"].append(row)
    added_rx += 1
  print(f"  + {added_rx} routine_exercises para r20")

  with open(DB_PATH, "w", encoding="utf-8") as f:
    json.dump(db, f, ensure_ascii=False, indent=2)
  print(f"\nArchivo guardado: {DB_PATH}")
  print(f"Total ejercicios: {len(db['exercises'])}")
  print(f"Total rutinas: {len(db['routines'])}")
  print(f"Total routine_exercises: {len(db['routine_exercises'])}")

if __name__ == "__main__":
  main()
