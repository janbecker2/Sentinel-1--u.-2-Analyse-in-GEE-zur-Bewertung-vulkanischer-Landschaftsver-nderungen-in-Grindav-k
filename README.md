# Analyse von Sentinel-1- und Sentinel-2-Daten mithilfe der Google Earth Engine (GEE) zur Beurteilung aktueller vulkanisch bedingter Landschaftsveränderungen -  Eine Fallstudie in der Region Grindavík (Island)

Dieses Repository enthält den Code und die Skripte zur Bachelorarbeit über die Erkennung vulkanisch bedingter Landschaftsveränderungen in der Region Grindavík (Island) mithilfe von Sentinel-1- und Sentinel-2-Satellitendaten. In dieser Arbeit werden Satellitendaten zur Beurteilung aktueller vulkanisch bedingter
Landschaftsveränderungen in der Region Grindavík untersucht. Hierbei kommen Daten der Sentinel-1- und Sentinel-2-Missionen der European Space Agency (ESA) zum Einsatz. Die Analyse fokussiert sich einerseits auf die Klassifikation junger Lavaströme, andererseits auf die Untersuchung einer vulkano-tektonisch relevanten Lineation. Zur
Verarbeitung und Analyse der Daten wurde die cloudbasierte Plattform Google Earth Engine genutzt. Ziel ist es, das Potenzial von Sentinel-1- und Sentinel-2-Daten zur Erfassung junger Lavaflächen sowie vulkano-tektonischer Strukturen zu untersuchen. Darüber hinaus werden die Möglichkeiten zur automatisierten Umsetzung dieser Prozesse in der cloudbasierten Analyseumgebung Google Earth Engine (GEE) evaluiert.
## Inhalte
### Lavaklassifikation

- `S1_Lavaklassifikation.js` – Klassifikation von Lavaflüssen auf Basis von Sentinel-1-Daten  
- `S2_Lavaklassifikation.js` – Klassifikation von Lavaflüssen auf Basis von Sentinel-2-Daten  


### Erkennung von Lineationen

- `S1_Sobel.js` – Anwendung eines gerichteten Sobel-Filters auf Sentinel-1-Daten 
- `S2_Sobel.js` – Anwendung eines gerichtetenSobel-Filters auf Sentinel-2-Daten

> **Hinweis**: Trainingsdaten und Geometrien (Untersuchungsgebiete) sind als Assets in der GEE erstellt worden und daher nicht im Repository enthalten.

## Technologien

- **Google Earth Engine**
- **Sentinel-1 & Sentinel-2**
- **SNIC-Segmentierung**
- **Hauptkomponetenanalyse**
- **Spektrale Indizes**
- **Random Forest**
- **Sobel-Filter**



