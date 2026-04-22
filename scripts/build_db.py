"""
Mergea todos los archivos de workout_database/ en workout_database.json.

Flujo de trabajo:
  1. Editar workout_database/<disciplina>.json
  2. python scripts/build_db.py
  3. node scripts/seed-ejercicios.js   (para subir a Supabase)

Archivos leídos:
  workout_database/musculacion.json  → exercises
  workout_database/crossfit.json     → exercises
  workout_database/oly.json          → exercises
  workout_database/funcional.json    → exercises
  workout_database/otros.json        → exercises (si existe)
  workout_database/shared.json       → routines, routine_exercises, patterns, generator_rules
"""
import json, pathlib

ROOT   = pathlib.Path(__file__).parent.parent
SRCDIR = ROOT / "workout_database"
OUT    = ROOT / "workout_database.json"

DISC_FILES  = ["musculacion", "crossfit", "oly", "funcional", "otros"]
SHARED_KEYS = ["routines", "routine_exercises", "patterns", "generator_rules"]

def main():
    all_exercises = []
    for name in DISC_FILES:
        path = SRCDIR / f"{name}.json"
        if not path.exists():
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        exs = data.get("exercises", [])
        all_exercises.extend(exs)
        print(f"  {name}.json: {len(exs)} ejercicios")

    # Detectar IDs duplicados
    ids = [e["id"] for e in all_exercises]
    dupes = [i for i in ids if ids.count(i) > 1]
    if dupes:
        print(f"\nADVERTENCIA: IDs duplicados detectados: {set(dupes)}")

    shared_path = SRCDIR / "shared.json"
    shared = {}
    if shared_path.exists():
        with open(shared_path, encoding="utf-8") as f:
            shared = json.load(f)
        for k in SHARED_KEYS:
            if k in shared:
                print(f"  shared.json [{k}]: {len(shared[k])} entradas")

    db = {"exercises": all_exercises}
    db.update({k: shared[k] for k in SHARED_KEYS if k in shared})

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

    print(f"\nworkout_database.json generado:")
    print(f"  Total ejercicios : {len(all_exercises)}")
    by_disc = {}
    for e in all_exercises:
        d = e.get("disciplina", "?")
        by_disc[d] = by_disc.get(d, 0) + 1
    for d, n in sorted(by_disc.items()):
        print(f"    {d}: {n}")

if __name__ == "__main__":
    main()
