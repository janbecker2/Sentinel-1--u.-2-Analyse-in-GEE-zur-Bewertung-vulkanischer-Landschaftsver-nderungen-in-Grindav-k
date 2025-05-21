# Analyse von Sentinel-1- und Sentinel-2-Daten mithilfe der Google Earth Engine (GEE) zur Beurteilung aktueller vulkanisch bedingter Landschaftsveränderungen -  Eine Fallstudie in der Region Grindavík (Island)

Dieses Repository enthält den Code und die Skripte zur Bachelorarbeit über die Erkennung vulkanisch bedingter Landschaftsveränderungen in der Region Grindavík (Island) mithilfe von Sentinel-1- und Sentinel-2-Satellitendaten. Die Analyse erfolgt in der Google Earth Engine (GEE) unter Nutzung von Zeitreihen, Sobel-Filterungen, Segmentierung und Klassifikation.

## Inhalte

- `lava_detection.js`: Hauptskript zur Erkennung und Klassifikation von Lavaflüssen anhand von Sentinel-Daten
- `eruption_app.js`: GEE-App mit Dropdown zur interaktiven Auswahl von Eruptionsereignissen
- Trainingsdaten (als GEE-Assets referenziert, nicht im Repo enthalten)

## Technologien

- **Google Earth Engine**
- **Sentinel-1 & Sentinel-2**
- **SNIC-Segmentierung**
- **Sobel-Filterung**
- **Random Forest Klassifikation**

## Ziel

Ziel ist es, ein automatisiertes Verfahren zur Beurteilung aktueller vulkanisch bedingter Landschaftsveränderungen zu entwickeln, das sich auf andere Regionen und Ereignisse übertragen lässt.

## Anwendung

Die interaktive App kann innerhalb der GEE-Umgebung verwendet werden. Auswahl der Eruption erfolgt über ein Dropdown-Menü; daraufhin wird die entsprechende Analyse ausgeführt.

## Lizenz

MIT License – siehe [LICENSE](LICENSE)

---

