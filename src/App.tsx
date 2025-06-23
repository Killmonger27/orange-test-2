import { useState, useRef, useEffect } from "react";
import {
  Send,
  Phone,
  AlertTriangle,
  Heart,
  Shield,
  Clock,
  Brain,
  Wifi,
  WifiOff,
} from "lucide-react";

const AssistantPremiersSecours = () => {
  const [messages, setMessages] = useState([
    {
      sender: "assistant",
      text: "🚨 Assistant de premiers secours activé avec IA médicale MedAlpaca.\n\nVous pouvez :\n• Décrire une situation d'urgence pour des conseils immédiats\n• Poser des questions médicales générales\n• Utiliser les suggestions rapides ci-dessous\n\nEn cas d'urgence vitale immédiate, appelez le  18 !",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("ready"); // ready, error, loading
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Configuration MedAlpaca
  const HUGGINGFACE_API_URL =
    "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium";
  const HF_API_KEY = import.meta.env.VITE_REACT_APP_HUGGINGFACE_API_KEY;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Base de connaissances des premiers secours (fallback)
  const premierSecoursDB = {
    etouffement: {
      keywords: ["étouffe", "etouff", "avale", "respire plus", "obstruction"],
      response:
        "🚨 URGENCE - ÉTOUFFEMENT:\n\n1.  Appelez le  18 immédiatement \n2. Si la personne peut encore tousser → Encouragez-la à tousser\n3. Si elle ne peut plus tousser :\n   • Adulte: 5 claques dans le dos + compression abdominale (manœuvre de Heimlich)\n   • Bébé: Tête en bas, 5 claques entre omoplates\n4. Alternez jusqu'à désobstruction ou arrivée secours",
      isEmergency: true,
    },
    inconscience: {
      keywords: [
        "inconscient",
        "evanoui",
        "sans connaissance",
        "ne répond pas",
      ],
      response:
        "🚨 URGENCE - PERTE DE CONSCIENCE:\n\n1.  Appelez le  18 immédiatement \n2. Vérifiez la respiration (10 secondes max)\n3. Si elle respire: Position Latérale de Sécurité (PLS)\n4. Si elle ne respire pas: Massage cardiaque + bouche-à-bouche\n5. Restez avec la personne jusqu'aux secours",
      isEmergency: true,
    },
    saignement: {
      keywords: ["saigne", "sang", "hémorragie", "coupure", "blessure"],
      response:
        "🩸 SAIGNEMENT IMPORTANT:\n\n1.  Si saignement abondant → Appelez le  18 \n2. Compression directe avec tissu propre\n3. Surélevez le membre si possible\n4. Ne retirez JAMAIS un objet planté\n5. Point de compression si nécessaire\n6. Surveillez les signes de choc",
      isEmergency: false,
    },
    brulure: {
      keywords: ["brûlure", "brule", "feu", "eau chaude", "vapeur"],
      response:
        "🔥 BRÛLURE:\n\n1.  Si étendue/grave → Appelez le  18 \n2. Refroidir immédiatement (eau froide  18-20min)\n3. Retirer bijoux/vêtements non collés\n4. Ne PAS percer les cloques\n5. Couvrir avec linge propre\n6. Surveiller signes de choc",
      isEmergency: false,
    },
    malaise: {
      keywords: [
        "malaise",
        "douleur poitrine",
        "crise cardiaque",
        "avc",
        "vertiges",
      ],
      response:
        "💔 MALAISE/DOULEUR THORACIQUE:\n\n1.  Appelez le  18 immédiatement \n2. Installez en position demi-assise\n3. Desserrez les vêtements\n4. Ne donnez rien à boire/manger\n5. Rassurez et surveillez constamment\n6. Préparez-vous à la réanimation si nécessaire",
      isEmergency: true,
    },
    fracture: {
      keywords: ["fracture", "cassé", "entorse", "douleur os", "déformé"],
      response:
        "🦴 FRACTURE/ENTORSE:\n\n1. Ne bougez pas la zone blessée\n2. Immobilisez avec attelle improvisée\n3. Appliquez froid (pas directement sur peau)\n4.  Si fracture ouverte/déformation → Appelez le  18 \n5. Surveillez circulation en aval\n6. Transport médicalisé si nécessaire",
      isEmergency: false,
    },
  };

  // Fonction pour appeler l'API MedAlpaca
  const callMedAlpacaAPI = async (question: string) => {
    if (!HF_API_KEY) {
      throw new Error("Clé API Hugging Face manquante");
    }

    const prompt = `Tu es un assistant médical d'urgence français. Réponds en français avec des conseils de premiers secours précis et clairs. Si c'est une urgence vitale, mentionne d'appeler le 18.

Question: ${question}

Réponse:`;

    try {
      const response = await fetch(HUGGINGFACE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.3,
            do_sample: true,
            top_p: 0.9,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extraire la réponse générée
      let generatedText = "";
      if (Array.isArray(data) && data[0]?.generated_text) {
        generatedText = data[0].generated_text;
      } else if (data.generated_text) {
        generatedText = data.generated_text;
      } else {
        throw new Error("Format de réponse inattendu");
      }

      // Nettoyer la réponse (retirer le prompt s'il est inclus)
      const cleanedResponse = generatedText.replace(prompt, "").trim();

      return {
        text: cleanedResponse || generatedText,
        isEmergency:
          cleanedResponse.toLowerCase().includes("18") ||
          cleanedResponse.toLowerCase().includes("urgence") ||
          cleanedResponse.toLowerCase().includes("pompiers"),
        source: "medalpaca",
      };
    } catch (error) {
      console.error("Erreur API MedAlpaca:", error);
      throw error;
    }
  };

  // Analyser avec la base de connaissances locale (fallback)
  const analyzeEmergency = (text: string) => {
    const textLower = text.toLowerCase();

    for (const [type, data] of Object.entries(premierSecoursDB)) {
      if (data.keywords.some((keyword) => textLower.includes(keyword))) {
        return {
          type,
          response: data.response,
          isEmergency: data.isEmergency,
          source: "local",
        };
      }
    }

    return {
      type: "general",
      response:
        "⚠️ Situation non identifiée automatiquement.\n\nConseils généraux:\n1. Évaluez la gravité\n2. Si doute → Appelez le 18\n3. Sécurisez la zone\n4. Ne bougez pas la victime sauf danger\n5. Surveillez les constantes vitales\n\n En cas d'urgence vitale, appelez toujours le 18 ",
      isEmergency: false,
      source: "local",
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput("");

    try {
      let response;

      setAiStatus("loading");
      try {
        response = await callMedAlpacaAPI(input);
        setAiStatus("ready");
      } catch (error) {
        console.error("Erreur MedAlpaca, utilisation du fallback:", error);
        setAiStatus("error");
        response = analyzeEmergency(input);
      }

      // Ajouter un délai pour simuler le traitement
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const assistantMessage = {
        sender: "assistant",
        text: "text" in response ? response.text : response.response,
        timestamp: new Date(),
        isEmergency: response.isEmergency,
        source: response.source,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        sender: "assistant",
        text:
          "❌ Erreur lors du traitement. Utilisation des conseils de base.\n\n" +
          analyzeEmergency(input).response,
        timestamp: new Date(),
        isEmergency: true,
        source: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAiStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyCall = () => {
    alert(
      "🚨 Composition du 18\n\nEn situation réelle, votre téléphone composerait automatiquement le 18.\n\nInformations à donner:\n- Votre localisation exacte\n- Nature de l'urgence\n- État de la victime\n- Votre numéro de téléphone"
    );
  };

  const getSourceIcon = (source: unknown) => {
    switch (source) {
      case "medalpaca":
        return <Brain className="w-4 h-4 text-blue-600" />;
      case "local":
        return <Shield className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getSourceLabel = (source: unknown) => {
    switch (source) {
      case "medalpaca":
        return "IA Médicale";
      case "local":
        return "Base locale";
      case "error":
        return "Mode dégradé";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-500 p-3 rounded-full">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Assistant Premiers Secours
                </h1>
                <p className="text-gray-600 flex items-center space-x-2">
                  <span>Intelligence artificielle médicale MedAlpaca</span>
                  <span className="flex items-center space-x-1">
                    {aiStatus === "ready" && (
                      <Wifi className="w-4 h-4 text-green-500" />
                    )}
                    {aiStatus === "error" && (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    {aiStatus === "loading" && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    )}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleEmergencyCall}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>Appeler le 18</span>
              </button>
            </div>
          </div>

          {/* Chat Container */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      msg.sender === "user"
                        ? "bg-blue-500 text-white"
                        : msg.isEmergency
                        ? "bg-red-100 border-l-4 border-red-500 text-red-800"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.sender === "assistant" && msg.isEmergency && (
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-600">
                          URGENCE VITALE
                        </span>
                      </div>
                    )}

                    <div className="whitespace-pre-line text-sm">
                      {msg.text}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div
                        className={`text-xs ${
                          msg.sender === "user"
                            ? "text-blue-200"
                            : "text-gray-500"
                        }`}
                      >
                        <Clock className="w-3 h-3 inline mr-1" />
                        {msg.timestamp.toLocaleTimeString()}
                      </div>

                      {msg.sender === "assistant" && msg.source && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          {getSourceIcon(msg.source)}
                          <span>{getSourceLabel(msg.source)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      <span className="text-gray-600">
                        {HF_API_KEY
                          ? "IA médicale en analyse..."
                          : "Analyse en cours..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Décrivez la situation d'urgence ou posez une question médicale..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) =>
                    e.key === "Enter" && !isLoading && handleSend()
                  }
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
                >
                  <Send className="w-5 h-5" />
                  <span>Envoyer</span>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Une personne s'étouffe",
                  "Saignement abondant",
                  "Perte de conscience",
                  "Douleur à la poitrine",
                  "Brûlure importante",
                  "Que faire en cas de fracture ?",
                  "Comment reconnaître un AVC ?",
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">
                Avertissement Important
              </span>
            </div>
            <p className="text-yellow-700 text-sm mt-2">
              Cet assistant ne remplace pas un avis médical professionnel. En
              cas d'urgence vitale, composez immédiatement le 18 (Pompiers). Les
              conseils fournis par l'IA MedAlpaca sont basés sur l'apprentissage
              automatique et doivent être confirmés par un professionnel de
              santé.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPremiersSecours;
