# Analyse von Sentinel-1- und Sentinel-2-Daten mithilfe der Google Earth Engine (GEE) zur Beurteilung aktueller vulkanisch bedingter Landschaftsveränderungen -  Eine Fallstudie in der Region Grindavík (Island)

Dieses Repository enthält den Code und die Skripte zur Bachelorarbeit über die Erkennung vulkanisch bedingter Landschaftsveränderungen in der Region Grindavík (Island) mithilfe von Sentinel-1- und Sentinel-2-Satellitendaten. Die Analyse erfolgt in der Google Earth Engine (GEE) unter Nutzung von Zeitreihen, Sobel-Filterungen, Segmentierung und Klassifikation.

## Inhalte
### Lavaklassifikation

- `S1_Lavaklassifikation.js` – Klassifikation von Lavaflüssen auf Basis von Sentinel-1-Daten  
- `S2_Lavaklassifikation.js` – Klassifikation von Lavaflüssen auf Basis von Sentinel-2-Daten  
- `lava_detection.js` – Kombiniertes Skript zur Detektion von Veränderungen mithilfe trainierter Klassifikatoren  
- `eruption_app.js` – Interaktive GEE-App zur Auswahl und Analyse einzelner Eruptionsereignisse über ein Dropdown-Menü

### Erkennung von Lineationen

- `S1_Sobel.js` – Anwendung eines gerichteten Sobel-Filters auf Sentinel-1-Daten zur Extraktion linearer Strukturen  
- `S2_Sobel.js` – Anwendung des Sobel-Filters auf Hauptkomponenten der Sentinel-2-Daten

> **Hinweis**: Trainingsdaten und Geometrien (Untersuchungsgebiete) sind als Assets in der GEE ertellt worden und daher nicht im Repository enthalten.

## Technologien

- **Google Earth Engine**
- **Sentinel-1 & Sentinel-2**
- **SNIC-Segmentierung**
- **Hauptkomponetenanalyse**
- **Spektrale Indizes**
- **Random Forest**
- **Sobel-Filter**



