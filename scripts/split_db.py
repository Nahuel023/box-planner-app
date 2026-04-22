"""
Migración única: parte workout_database.json en archivos por disciplina.

Resultado:
  workout_database/
    musculacion.json   ← { "exercises": [...] }
    crossfit.json
    oly.json
    funcional.json
    shared.json        ← { "routines", "routine_exercises", "patterns", "generator_rules" }

Ejecutar UNA sola vez. Después usar build_db.py para regenerar workout_database.json.
"""
import json, pathlib

ROOT   = pathlib.Path(__file__).parent.parent
SRC    = ROOT / "workout_database.json"
OUTDIR = ROOT / "workout_database"

DISCIPLINES = ["musculacion", "crossfit", "oly", "funcional"]
SHARED_KEYS = ["routines", "routine_exercises", "patterns", "generator_rules"]

def main():
    print(f"Leyendo {SRC}...")
    with open(SRC, encoding="utf-8") as f:
        db = json.load(f)

    OUTDIR.mkdir(exist_ok=True)

    # ── Ejercicios por disciplina ──────────────────────────────────────────
    by_disc = {d: [] for d in DISCIPLINES}
    unknown = []
    for e in db["exercises"]:
        disc = e.get("disciplina", "musculacion")
        if disc in by_disc:
            by_disc[disc].append(e)
        else:
            unknown.append(e)

    for disc, exercises in by_disc.items():
        out = OUTDIR / f"{disc}.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"exercises": exercises}, f, ensure_ascii=False, indent=2)
        print(f"  {out.name}: {len(exercises)} ejercicios")

    if unknown:
        out = OUTDIR / "otros.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"exercises": unknown}, f, ensure_ascii=False, indent=2)
        print(f"  otros.json: {len(unknown)} ejercicios (disciplina desconocida)")

    # ── Shared (rutinas, reglas, patrones) ─────────────────────────────────
    shared = {k: db[k] for k in SHARED_KEYS if k in db}
    out = OUTDIR / "shared.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(shared, f, ensure_ascii=False, indent=2)
    print(f"  shared.json: {sum(len(v) for v in shared.values())} entradas")

    print(f"\nListo. Ahora podés editar workout_database/<disciplina>.json")
    print(f"y ejecutar 'python scripts/build_db.py' para regenerar workout_database.json")

if __name__ == "__main__":
    main()
