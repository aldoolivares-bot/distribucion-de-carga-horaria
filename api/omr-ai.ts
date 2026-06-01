import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    // Modo demo sin API key
    const { questionCount } = req.body;
    const count = Number(questionCount) || 30;
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
      alumno: "DEMO (sin API key)",
      fecha: new Date().toLocaleDateString("es-CL"),
      total_preguntas: count,
      respuestas,
      confianza: "alta",
      advertencias: [
        "[MODO DEMO] VITE_GEMINI_API_KEY no está configurada en Vercel.",
        "Ve a tu proyecto en vercel.com > Settings > Environment Variables y agrega VITE_GEMINI_API_KEY.",
      ],
    });
  }

  try {
    const { image, questionCount } = req.body;
    const count = Number(questionCount) || 30;

    if (!image) {
      return res.status(400).json({ error: "No se proporcionó ninguna imagen." });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Strip base64 metadata header if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data,
      },
    };

    const systemInstruction = `Eres un sistema OMR (Optical Mark Recognition) experto de clase mundial, similar a ZipGrade.

## FORMATO DE LA HOJA
- 4 marcadores cuadrados negros en las 4 esquinas de la hoja.
- ${count} preguntas organizadas en columnas.
- Cada pregunta tiene círculos con letras: A B C D E.
- Los círculos MARCADOS se ven más oscuros, rellenos o con trazado interior visible.
- Los NO marcados están vacíos o solo tienen borde claro.

## PASO 1 - ORIENTACIÓN
Localiza los 4 cuadros negros de las esquinas.
Corrige mentalmente la perspectiva, inclinación y rotación de la imagen.

## PASO 2 - LECTURA (MUY IMPORTANTE)
Recorre FILA POR FILA las ${count} preguntas.
En cada fila, COMPARA los 5 círculos entre sí:
- El que se vea MÁS OSCURO o RELLENO comparado con los otros 4 = respuesta marcada.
- NUNCA pongas OMITIDA por defecto. Esfuérzate en detectar diferencias sutiles de tono.
- Solo marca OMITIDA si los 5 círculos son VISUALMENTE IDÉNTICOS (todos completamente vacíos).
- Solo marca INVÁLIDA si 2 o más círculos están claramente marcados en la misma pregunta.

## PASO 3 - RESPUESTA
Responde SOLO con JSON válido, sin markdown ni texto adicional.`;

    console.log(`Analizando hoja OMR con Gemini para ${count} preguntas...`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          imagePart,
          {
            text: `Analiza esta hoja de respuestas y extrae las alternativas marcadas para las preguntas 1 a ${count}. Retorna JSON válido.`,
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alumno: {
              type: Type.STRING,
              description: "Nombre del alumno si es legible, sino null",
            },
            fecha: {
              type: Type.STRING,
              description: "Fecha si es legible, sino null",
            },
            total_preguntas: {
              type: Type.INTEGER,
              description: "Total de preguntas analizadas",
            },
            respuestas: {
              type: Type.OBJECT,
              description:
                "Mapa de número de pregunta a respuesta detectada ('A','B','C','D','E','OMITIDA','INVÁLIDA')",
            },
            confianza: {
              type: Type.STRING,
              description: "'alta' | 'media' | 'baja'",
            },
            advertencias: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Preguntas dudosas o problemas detectados",
            },
          },
          required: [
            "alumno",
            "fecha",
            "total_preguntas",
            "respuestas",
            "confianza",
            "advertencias",
          ],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se recibió respuesta del modelo Gemini.");
    }

    console.log("Respuesta Gemini:", resultText);
    const parsedResult = JSON.parse(resultText);
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error OMR con Gemini:", error);
    return res.status(500).json({
      error: error?.message || "Algo falló durante el análisis con IA.",
    });
  }
}
