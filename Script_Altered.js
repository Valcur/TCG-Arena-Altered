const fs = require('fs').promises;

// --- Fonction utilitaire : extraire les noms entre [ ] ---
const extractTokenNames = (text) => {
    if (!text) return [];
    const matches = text.match(/\[([^\]]+)\]/g) || [];
    return matches
        .map((m) => m.replace(/\[|\]/g, ""))
        .map((m) => m.replace(/\s*\d+\/\d+\/\d+\s*/g, "").trim())
        .filter((t) => t.length > 0);
};

const extractNumberValue = (text) => {
    return text
    return text ? Number(text.replace(/\D/g, "")) : undefined
}

async function run() {
    // Note : on récupère tout, y compris les tokens via l'API
    const baseUrl = "https://cards.alteredcore.org/api/cards?set.reference[]=CORE&set.reference[]=COREKS&set.reference[]=PROMO_GENCON_2023&set.reference[]=PROMO_2024&set.reference[]=JUDGE&set.reference[]=MUSUBI&set.reference[]=FUGUE&set.reference[]=EOLE&set.reference[]=DUSTER&set.reference[]=DUSTERTOP&set.reference[]=DUSTEROP&set.reference[]=CYCLONE&set.reference[]=ALIZE&set.reference[]=TCS3&set.reference[]=BISE&set.reference[]=WCF25&set.reference[]=WCQ25&set.reference[]=WCS25&set.reference[]=WCS26&rarity[]=RARE&rarity[]=COMMON&rarity[]=EXALTED&itemsPerPage=1000";
    const outputFilePath = 'AlteredCards.json';

    let allApiCards = [];
    let currentPage = 1;
    let lastPage = 1;

    try {
        console.log("🚀 Démarrage de la récupération des données...");
        
        // --- ÉTAPE 1 : Pagination ---
        while (currentPage <= lastPage) {
            console.log(`📥 Récupération de la page ${currentPage}/${lastPage}...`);
            const response = await fetch(`${baseUrl}&page=${currentPage}`);
            const data = await response.json();

            allApiCards.push(...data.member);
            if (currentPage === 1) lastPage = data.lastPage;
            currentPage++;
        }

        console.log(`✅ ${allApiCards.length} cartes récupérées.`);

        let result = {};
        let tokensLookup = {};

        // --- ÉTAPE 2 : Création d'un dictionnaire de référence pour le matching des tokens ---
        allApiCards.forEach(c => {
            if (c.cardType && c.cardType.reference.includes("TOKEN")) {
                tokensLookup[c.name.en.toLowerCase()] = c.reference;
            }
        });

        // --- ÉTAPE 3 : Transformation des données ---
        allApiCards.forEach((c) => {
            const cardId = c.reference;
            const cardSet = c.set?.reference ?? "Unknown Set";
            const isToken = c.cardType.reference.includes("TOKEN");
            
            if (!c.set) {
                console.log(c)
            }

            // Construction du nom multilingue
            // On ajoute la faction dans le nom uniquement si c'est une Rare (selon ta logique)
            const suffix = c.rarity?.reference === "RARE" ? ` - ${c.faction.code}` : "";

            const cardNameObj = {
                en: c.name.en + suffix,
                fr: (c.name.fr || c.name.en) + suffix
            };

            let newCard = {
                id: cardId,
                face: {
                    front: {
                        name: cardNameObj,
                        type: c.cardType.name.en, // Ou un objet fr/en si tu préfères
                        cost: c.mainCost || 0,
                        image: {
                            en: `https://cdn.alteredcore.org/cards/en/${cardSet}/${cardId}.webp`,
                            fr: `https://cdn.alteredcore.org/cards/fr/${cardSet}/${cardId}.webp`
                        }
                    }
                },
                name: cardNameObj,
                type: c.cardType.name.en,
                cost: c.mainCost || 0,
                faction: c.faction.name,
                rarity: c.rarity.reference,
                set: c.set?.name ?? "Unknown Set",
                "Main Cost": extractNumberValue(c.mainCost),
                "Recall Cost": extractNumberValue(c.recallCost),
                "Ocean Power": extractNumberValue(c.oceanPower),
                "Forest Power": extractNumberValue(c.forestPower),
                "Mountain Power": extractNumberValue(c.mountainPower)
            };

            if (isToken) {
                newCard.isToken = true
            }

            // --- ÉTAPE 4 : Extraction et liaison des Tokens ---
            const possibleFields = [c.mainEffect?.en, c.echoEffect?.en].filter(Boolean);
            const foundTokenNames = new Set();

            for (const fieldText of possibleFields) {
                const extracted = extractTokenNames(fieldText);
                extracted.forEach(name => foundTokenNames.add(name.toLowerCase()));
            }

            let foundTokensIds = [];
            for (const tokenName of foundTokenNames) {
                const tokenId = tokensLookup[tokenName];
                if (tokenId) {
                    foundTokensIds.push(tokenId);
                }
            }

            if (foundTokensIds.length > 0) {
                newCard.tokens = foundTokensIds;
            }

            // On ajoute tout au résultat (Cartes ET Tokens)
            result[cardId] = newCard;
        });

        // --- ÉTAPE 5 : Sauvegarde ---
        await fs.writeFile(outputFilePath, JSON.stringify(result, null, 2), 'utf8');
        
        console.log("---");
        console.log(`💾 Fichier sauvegardé : ${outputFilePath}`);
        console.log(`📊 Total dans le JSON : ${Object.keys(result).length} entrées.`);

    } catch (err) {
        console.error("❌ Erreur :", err);
    }
}

run();