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
      if (!image) {
        return res.status(400).json({ error: "No se proporcionó ninguna imagen." });
      }

      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY no está configurada. Por favor configúrala en Settings > Secrets en la UI de AI Studio." 
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

      const systemInstruction = `Eres un experto de clase mundial en lectura de hojas de respuesta OMR (optical mark recognition).
Analizas la imagen de la hoja de respuestas y extraes las alternativas marcadas por el estudiante.

## CONTEXTO
La imagen puede estar tomada en ángulo, con sombras, arrugas o distorsión de perspectiva.
DEBES igualmente leer las marcas aunque la hoja no esté perfectamente plana o recta.

## FORMATO DE LA HOJA
- La hoja contiene preguntas numeradas del 1 al ${questionCount}.
- Cada pregunta tiene círculos de alternativa: A, B, C, D (u opciones similares).
- El círculo MARCADO se ve significativamente más oscuro, totalmente pintado/relleno, o con una marca/trazado fuerte adentro.
- Los no marcados están vacíos o solo tienen un borde claro.

## INSTRUCCIONES CRÍTICAS DE DETECCIÓN
1. Primero localiza los 4 marcadores de esquina negros para orientar la hoja.
2. Corrige mentalmente cualquier perspectiva, rotación o inclinación de la imagen.
3. Recorre FILA POR FILA las ${questionCount} preguntas de arriba hacia abajo.
4. Para cada pregunta, identifica cuál círculo está marcado (más oscuro/relleno).
5. Si una pregunta tiene más de un círculo marcado, indícalo como "INVÁLIDA".
6. Si ningún círculo está marcado (todos están vacíos o idénticos), indícalo como "OMITIDA". Nunca pongas OMITIDA por defecto — esfuérzate en distinguir diferencias de tono sutiles en la marca del estudiante.

## INSTRUCCIONES DE FORMATO
Debes responder estrictamente con un JSON estructurado según la especificación provista, sin markdown, sin texto extra.`;

      console.log(`Analyzing OMR sheet with Gemini-3.5-Flash for ${questionCount} questions...`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: `Por favor analiza esta imagen de hoja de respuestas y extrae las alternativas marcadas por el estudiante para las preguntas de la 1 a la ${questionCount}. Retorna un JSON válido.` }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              total_preguntas: {
                type: Type.INTEGER,
                description: "El total de preguntas analizadas"
              },
              respuestas: {
                type: Type.OBJECT,
                description: "Mapeo de número de pregunta (ej. '1', '2', '3') a su respuesta detectada ('A', 'B', 'C', 'D', 'OMITIDA', 'INVÁLIDA')"
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
                description: "Cualquier advertencia de iluminación, rotación o problemas de legibilidad"
              }
            },
            required: ["total_preguntas", "respuestas", "confianza", "advertencias"]
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
