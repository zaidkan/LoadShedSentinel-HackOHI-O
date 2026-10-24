# HackOHI/O 2026 — Transformer AI Sentinel & Outage Concierge
## Simple Project Guide, System Architecture & 4-Member Build Plan

**Target Track:** AEP AI Outage Concierge Challenge  
**Team Structure:** 4 Members working concurrently  
**Build Window:** 24 Hours  
**Workspace File:** [`HackOHIO-2026-Transformer-Sensing-Build-Plan.md`](file:///c:/Users/ritav/Documents/Codex/2026-10-23/i-ne/outputs/HackOHIO-2026-Transformer-Sensing-Build-Plan.md)

---

## 1. The Simple Big Picture: What We Are Building

Imagine you are looking at a wooden power pole down your street. High up on that pole is a **Distribution Transformer**—a big grey steel cylinder that takes dangerous 7,200-volt electricity from the high-voltage lines and steps it down to safe 120V/240V power for your home.

### The Real-World Problem Today
Right now, in the real world:
* That transformer is **a completely "dumb" piece of metal**. It has no sensors and no internet.
* When a storm hits, lightning strikes, or a tree branch falls across the wires, the power company (AEP) **has no idea what physically happened**.
* Did a fuse switch simply pop open? Or did the transformer overheat, boil its cooling oil, and catch fire inside?
* AEP literally doesn't know until:
  1. Angry neighbors flood their call center.
  2. A lineworker drives a truck in the dark with binoculars to stare at the pole.
* If they guess wrong, they send the wrong truck, with the wrong parts, wasting 6 to 12 hours.

---

## 2. Our Solution: The Transformer AI Sentinel

We attach a smart, self-contained **Sensor & AI Diagnostic Box** directly to the transformer pole.

```
       [ Sun / Daylight ]
               ↓
    [ Small Solar Panel ] (Liquid Energy Model)
               ↓
    [ Tough Cold-Weather Battery ]  --> Keeps the AI Brain Alive for 68 Days
               ↓
    [ Sensors on the Transformer ]
      ├─ Temperature Sensor (Is the oil boiling?)
      ├─ Current Sensor (Did a lightning surge hit it?)
      ├─ Vibration Sensor (Did it arc or buzz violently?)
      └─ Fuse Switch Sensor (Did the physical switch drop open?)
               ↓
    ⭐ [ AGENTIC AI BRAIN ] ⭐
               ↓
    ┌───────────────────────────────────┬───────────────────────────────────┐
    ↓                                   ↓                                   ↓
[ Interactive 3D Monitor ]      [ Utility Lineworker Dispatch ]     [ Customer Outage Concierge ]
Shows the 3D pole, animated     Tells AEP: "Don't send 4 guys       Texts families: "Minor fuse
cutout dropping, live gauges    with a crane; send 1 guy with a     trip, back in 2 hrs" OR "Core
for judges to click.            100A fuse link. Repair: 1.7 hrs."   burned, back in 13 hrs."
```

### The "Liquid Energy" Power Trick
* When the main power grid goes down, normal sensors die because the wires have no electricity.
* Inspired by Y Combinator startup **Liquid Energy (YC F26)**, our sensor box has its own **mini solar panel and rugged battery** mounted right on the pole.
* It uses almost no power (about as much as a tiny LED). Even in a pitch-black winter storm with zero sunlight, **it stays alive and transmitting for 68 days straight**.

---

## 3. What the Agentic AI Actually Does (The 2 Big Scenarios)

The AI constantly reads the sensors. During a storm, it immediately diagnoses the exact failure:

### Scenario A: The Minor Glitch (Blown Fuse Cutout)
* **What the sensors see:** Voltage drops to zero, the physical fuse switch pops open, but the transformer oil temperature is normal (cool) and there is no smoke or gas.
* **The AI Diagnosis:** *"A tree branch brushed the wire for one second. The protective fuse switch dropped open to protect the transformer. The transformer itself is completely healthy!"*
* **The Lineworker Dispatch:** Send a regular pickup/bucket truck. The lineworker uses a fiberglass "hot stick" to insert a $15 replacement fuse link and push the switch closed.
  - AEP Labor Standard: **1.7 hours**.
* **The Customer Text:** *"A protective switch tripped on your street's pole. Your transformer is undamaged. Power will be restored in approximately 2 hours."*

### Scenario B: The Disaster (Destroyed Transformer Core)
* **What the sensors see:** A massive electrical current spike, followed by oil temperature rocketing past 120°C, extreme vibration, and dangerous Acetylene gas ($C_2H_2$) detected in the oil.
* **The AI Diagnosis:** *"Catastrophic internal short-circuit. The copper coils melted and the cooling oil carbonized. The transformer is dead and cannot be re-energized."*
* **The Lineworker Dispatch:** Do not waste time sending an inspector. Immediately dispatch a heavy boom/crane truck carrying a replacement 25kVA transformer and a 2-person crew.
  - AEP Labor Standard: 4 hours of physical work $\times$ 4.5 travel/safety multiplier = **13.5 hours**.
* **The Customer Text:** *"Severe storm damage physically destroyed Transformer #25298 on your block. A heavy replacement crew is en route. Restoration will take approximately 13.5 hours. If you have medical equipment (CPAP/insulin), activate your backup battery immediately."*

---

## 4. The 3D Interactive Animation: Your Presentation Showstopper

For your 3-minute video presentation to the judges, you won't just talk through slides. You will show an **interactive 3D digital twin** running right inside your web browser (built using Three.js):

* **What Judges See:** A crisp, textured 3D wooden utility pole with the cylindrical transformer, porcelain insulators, and our solar panel node.
* **Interactive Buttons for the Presentation:**
  1. `[Normal State]:` Green lights, oil temp reads a safe 45°C, transformer hums quietly.
  2. `[Simulate Storm Hit]:` Sparks fly! Live temperature gauge on screen spikes to 125°C!
  3. **The Mechanical Animation:** The physical **fuse cutout switch swings and drops open $180^\circ$ with a mechanical clack!** Electricity cuts off.
  4. `[AI Diagnostic Card Pops Up]:` The AI agent displays the live diagnosis, parts needed, and crew schedule.
  5. `[Lineworker Hot-Stick Fix]:` Lineworker tool recloses the switch, lights turn back on, and the dashboard celebrates restoration!

Judges can click and rotate the camera in 360 degrees. This proves to AEP electrical engineers that you understand physical grid hardware.

---

## 5. How the 4 Group Members Build This (Simple Task Division)

We have 4 members. Each member gets a completely separate job so nobody has to wait for anyone else:

| Group Member | Plain-English Role | What They Actually Build / Code |
|---|---|---|
| **Member 1** | **The Grid & Sensor Simulator** | Builds a Python script (`transformer_physics.py`) that simulates the sensor numbers (temperature, current spike, vibration) for both normal operation and storm failure, and calculates the exact repair time using AEP's official labor workbook. |
| **Member 2** | **The AI Diagnostic Brain** | Builds the logic (`agent_diagnostics.py`) that takes the sensor numbers, determines whether it's a simple blown fuse or a dead transformer, outputs the exact lineworker work order, and models the Liquid Energy solar/battery power node. |
| **Member 3** | **The Customer & Compliance Hub** | Builds the FastAPI web server (`routes.py`) and customer outage concierge (`alerts.py`). It takes the AI's transformer diagnosis and turns it into the **4 mandatory AEP customer alerts** (Pre-storm, Outage confirmed, Estimate updated, Restored) and ensures all privacy rules are met. |
| **Member 4** | **The 3D Web App & Presentation Lead** | Builds the frontend web app and the **interactive 3D pole/transformer model** using Three.js / React Three Fiber. Sets up the live sensor gauges, the animated cutout drop, and coordinates the 3-minute video recording. |

---

## 6. Why This Project Wins First Place

1. **It Solves the Real Engineering Problem:** AEP lineworkers and engineers spend millions of dollars every year driving around in storms trying to find which pole is broken. Our system tells them before they even leave the depot.
2. **It Solves the Customer Problem (The Brief!):** Customers get transparent, honest estimates based on real physical sensor data, rather than a generic "Pending" message.
3. **The 3D Visual is Unforgettable:** 90% of hackathon teams will show a flat map with some text boxes. You will show an interactive 3D transformer on a pole with live sensors, sparking faults, and an animated mechanical cutout drop.
