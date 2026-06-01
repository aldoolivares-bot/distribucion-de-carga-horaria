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

      const systemInstruction = `Eres un sistema OMR (Optical Mark Recognition) experto, igual a ZipGrade. Tu tarea es leer hojas de respuestas escaneadas con cámara de celular.

## FORMATO DE LA HOJA
- 4 marcadores cuadrados negros sólidos en las 4 esquinas de la hoja (son cuadrados, NO círculos).
- ${count} preguntas en columnas (columna izquierda preguntas 1-20, columna derecha 21 en adelante).
- Cada pregunta tiene círculos con letras: A B C D E.
- Círculo MARCADO: relleno oscuro, rayado, o con marca visible dentro.
- Círculo NO marcado: vacío, solo borde.

## PASO 1 — CORRECCIÓN DE PERSPECTIVA
La foto fue tomada con celular y puede estar inclinada o en ángulo.
Usa los 4 cuadrados negros de las esquinas como referencias para enderezar mentalmente la imagen antes de leer.

## PASO 2 — LECTURA FILA POR FILA
Para CADA pregunta del 1 al ${count}:
1. Mira los 5 círculos de esa fila.
2. Compáralos entre sí — el MÁS OSCURO o RELLENO es la respuesta.
3. NUNCA uses OMITIDA por defecto. Solo si los 5 círculos son visualmente IDÉNTICOS (todos vacíos) pon OMITIDA.
4. Si hay 2 o más marcados → INVÁLIDA.

## REGLA CRÍTICA
Prefiere detectar una respuesta aunque tengas duda, en lugar de poner OMITIDA. Una marca de lápiz tenue sigue siendo una marca.

## PASO 3 — RESPUESTA
Solo JSON válido, sin markdown ni texto extra.`;

      console.log(`Analyzing OMR sheet with gemini-2.0-flash for ${count} questions...`);

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [
            imagePart,
            { text: `Por favor analiza esta imagen de hoja de respuestas y extrae las alternativas marcadas por el estudiante para las preguntas de la 1 a la ${count}. Retorna un JSON válido.` }
          ]
        },
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
