const fs = require('fs').promises;

// --- Fonction utilitaire : extraire les noms entre [ ] ---
const extractTokenNames = (text) => {
    if (!text) return [];
    const matches = text.match(/\[([^\]]+)\]/g) || [];
    return matches
        .map((m) => m.replace(/\[|\]/g, "")) // remove brackets
        .map((m) => m.replace(/\s*\d+\/\d+\/\d+\s*/g, "").trim()) // remove stats like 1/1/1
        .filter((t) => t.length > 0);
};

// Fonction pour lire et modifier le fichier JSON
async function modifyJsonFile(inputFilePath, outputFilePath, result, tokens, isLast) {
    try {
        const isGeneratingTokenStep = result === false
        const data = await fs.readFile("Sets/" + inputFilePath, 'utf8');
        const jsonObject = JSON.parse(data);

        jsonObject.forEach((c) => {
            const cardId = c.reference;
            const cardType = c.cardType.name
            const image = c.imagePath
            const cost = Number(c.elements.MAIN_COST.replace(/\D/g, ""));
            const cardName = c.name + (c.rarity.reference === "RARE" ? " - " + c.mainFaction.reference : "");
            const isToken = c.cardType.reference.includes("TOKEN")

            let newCard = {
                id: cardId,
                face: {
                    front: {
                        name: cardName,
                        type: cardType,
                        cost: cost,
                        image: image
                    }
                },
                name: cardName,
                type: cardType,
                cost: cost,
                isToken: isToken,
                faction: c.mainFaction.name,
                rarity: c.rarity.name,
                "Main Cost": c.elements.MAIN_COST ? Number(c.elements.MAIN_COST.replace(/\D/g, "")) : undefined,
                "Recall Cost": c.elements.RECALL_COST ? Number(c.elements.RECALL_COST.replace(/\D/g, "")) : undefined,
                "Ocean Power": c.elements.OCEAN_POWER ? Number(c.elements.OCEAN_POWER.replace(/\D/g, "")) : undefined,
                "Forest Power": c.elements.FOREST_POWER ? Number(c.elements.FOREST_POWER.replace(/\D/g, "")) : undefined,
                "Mountain Power": c.elements.MOUNTAIN_POWER ? Number(c.elements.MOUNTAIN_POWER.replace(/\D/g, "")) : undefined,
            };

            if (!isGeneratingTokenStep) {
                const possibleFields = [
                    c.elements?.MAIN_EFFECT,
                    c.elements?.SECONDARY_EFFECT,
                    c.elements?.ADDITIONAL_EFFECT,
                    c.elements?.EFFECT,
                ].filter(Boolean);
            
                const foundTokenNames = new Set();

                for (const fieldText of possibleFields) {
                    const extracted = extractTokenNames(fieldText);
                    for (const name of extracted) {
                        foundTokenNames.add(name); // ✅ évite les doublons automatiquement
                    }
                }
            
                // --- Chercher dans le dictionnaire global des tokens ---
                let foundTokens = [];

                // --- Pour chaque nom détecté, on cherche le premier token correspondant ---
                for (const tokenName of foundTokenNames) {
                    const foundToken = Object.values(tokens || {}).find(
                        (token) => token.name.toLowerCase() === tokenName.toLowerCase()
                    );
                    if (foundToken) {
                        foundTokens.push(foundToken);
                    }
                }
           

                if (foundTokens.length > 0) {
                    newCard.tokens = foundTokens.map((t) => t.id);
                    //console.log(`🧩 ${cardName} → Tokens trouvés :`, newCard.tokens);
                }

                result[cardId] = newCard;
            }

            if (isGeneratingTokenStep && isToken) {
                tokens[cardId] = newCard;
                return
            }
        });

        console.log("File now has " + Object.keys(result).length + " cards");

        if (isLast) {
            await fs.writeFile(outputFilePath, JSON.stringify(result, null, 2), 'utf8');
            console.log('✅ Le fichier JSON final a été sauvegardé sous', outputFilePath);
            console.log("Cards total: " + Object.keys(result).length);
        }
    } catch (err) {
        console.error("Erreur :", err);
    }
}

async function run() {
    const outputFilePath = 'AlteredCards.json';

    // Add tokens manually as they are not in the .json
    let res = {}
    let tokens = {}

    const files = ["CORE_EN.json", "BISE_EN.json", "ALIZE_EN.json", "CYCLONE_EN.json"];

    // Exécution séquentielle

    // Tokens
    for (let i = 0; i < files.length; i++) {
        await modifyJsonFile(files[i], outputFilePath, false, tokens);
    }

    // Regular cards
    for (let i = 0; i < files.length; i++) {
        const isLast = i === files.length - 1;
        await modifyJsonFile(files[i], outputFilePath, res, tokens, isLast);
    }
}

run();