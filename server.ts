import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let's configure larger payload limits for base64 image sending
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Initialize server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // OMR AI Route
  app.post("/api/omr-ai", async (req, res) => {
    try {
      const { image, questionCount } = req.body;
      const count = Number(questionCount) || 30;
      if (!image) {
        return res.status(400).json({ error: "No se proporcionó ninguna imagen." });
      }

      // Check if API key is missing or placeholder
      if (!apiKey || apiKey === "MOCK_KEY" || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
        console.warn("GEMINI_API_KEY not configured. Falling back to simulated OMR analysis.");
        
        // Generate realistic simulated responses
        const respuestas: { [key: string]: string } = {};
        const options = ["A", "B", "C", "D", "E"];
        for (let i = 1; i <= count; i++) {
          const rand = (i * 7 + 13) % 100;
          if (rand < 4) {
            respuestas[String(i)] = "OMITIDA";
          } else if (rand < 6) {
            respuestas[String(i)] = "INVÁLIDA";
          } else {
            respuestas[String(i)] = options[rand % options.length];
          }
        }

        return res.json({
          alumno: "ALDO OLIVARES (Simulado)",
          fecha: "01/06/2026",
          total_preguntas: count,
          respuestas,
          confianza: "alta",
          advertencias: [
            "[MODO DEMO] GEMINI_API_KEY no está configurada.",
            "Para probar la corrección asistida por IA Gemini con hojas reales, configúrala en 'Settings > Secrets' en la barra superior.",
            "Este escaneo ha sido simulado con alta fidelidad para permitirte explorar el flujo de corrección, carga de notas e informes."
          ]
        });
      }

      // Strip base64 metadata header if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      };

      const systemInstruction = `Eres un sistema OMR (Optical Mark Recognition) experto de clase mundial, similar a ZipGrade, integrado con Inteligencia Artificial avanzada.

## FORMATO DE LA HOJA
- 4 marcadores cuadrados negros en las 4 esquinas de la hoja.
- 30 preguntas organizadas en 2 columnas:
  • Columna izquierda: preguntas del 1 al 20.
  • Columna derecha: preguntas del 21 al 30.
- Cada pregunta tiene 5 círculos con letras: A B C D E (u opciones similares).
- Los círculos marcados están RELLENOS o con una marca/trazado interior visible.
- Los no marcados están VACÍOS o solo tienen bordes claros de círculo.

## PASO 1 - ORIENTACIÓN
Localiza los 4 cuadros negros de las esquinas. Úsalos para corregir mentalmente la perspectiva, sombras, inclinación y rotación de la imagen.

## PASO 2 - LECTURA
Recorre cada fila de pregunta comparando sus 5 círculos entre sí para la columna izquierda (1 al 20) y la columna derecha (21 al 30).
La fila/círculo que se vea más oscuro, relleno o con trazo fuerte comparado con los otros círculos es la respuesta del estudiante.
- Solo marca OMITIDA si los círculos son visualmente idénticos (todos vacíos). No pongas OMITIDA por defecto — esfuérzate en distinguir diferencias sutiles de tono o marcas hechas a lápiz.
- Solo marca INVÁLIDA si hay 2 o más círculos marcados en la misma pregunta.

## PASO 3 - RESPUESTA
Debes responder estrictamente con un JSON estructurado de la siguiente forma, sin bloques de código markdown ni explicaciones de texto adicionales.`;

      console.log(`Analyzing OMR sheet with Gemini-3.5-Flash for ${count} questions...`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: `Por favor analiza esta imagen de hoja de respuestas y extrae las alternativas marcadas por el estudiante para las preguntas de la 1 a la ${count}. Retorna un JSON válido.` }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              alumno: {
                type: Type.STRING,
                description: "Nombre del alumno/estudiante si es legible, de lo contrario null"
              },
              fecha: {
                type: Type.STRING,
                description: "Fecha de la prueba u hoja si es legible, de lo contrario null"
              },
              total_preguntas: {
                type: Type.INTEGER,
                description: "El total de preguntas analizadas"
              },
              respuestas: {
                type: Type.OBJECT,
                description: "Mapeo de número de pregunta (ej. '1', '2', '3') a su respuesta detectada ('A', 'B', 'C', 'D', 'E', 'OMITIDA', 'INVÁLIDA')"
              },
              confianza: {
                type: Type.STRING,
                description: "Nivel de confianza general del análisis ('alta' | 'media' | 'baja')"
              },
              advertencias: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING
                },
                description: "detalla aquí cualquier pregunta dudosa, problemas de rotación o de legibilidad"
              }
            },
            required: ["alumno", "fecha", "total_preguntas", "respuestas", "confianza", "advertencias"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No se recibió respuesta o texto del modelo Gemini.");
      }

      console.log("Raw Response from Gemini:", resultText);
      const parsedResult = JSON.parse(resultText);
      res.json(parsedResult);
    } catch (error: any) {
      console.error("Error processing OMR sheet with Gemini:", error);
      res.status(500).json({ error: error?.message || "Algo falló durante el análisis con IA." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
