const fs = require('fs').promises;

// Fonction pour lire et modifier le fichier JSON
async function modifyJsonFile(inputFilePath, outputFilePath, result, isLast) {
    try {
        const data = await fs.readFile("Sets/" + inputFilePath, 'utf8');
        const jsonObject = JSON.parse(data);

        jsonObject.forEach((c) => {
            const cardId = c.reference;
            const cardType = c.cardType.name
            const image = c.imagePath
            const cost = Number(c.elements.MAIN_COST.replace(/\D/g, ""));
            const cardName = c.name + (c.rarity.reference === "RARE" ? " - " + c.mainFaction.reference : "");

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
                isToken: c.cardType.reference === "TOKEN",
                faction: c.mainFaction.name,
                rarity: c.rarity.name,
                "Main Cost": c.elements.MAIN_COST ? Number(c.elements.MAIN_COST.replace(/\D/g, "")) : undefined,
                "Recall Cost": c.elements.RECALL_COST ? Number(c.elements.RECALL_COST.replace(/\D/g, "")) : undefined,
                "Ocean Power": c.elements.OCEAN_POWER ? Number(c.elements.OCEAN_POWER.replace(/\D/g, "")) : undefined,
                "Forest Power": c.elements.FOREST_POWER ? Number(c.elements.FOREST_POWER.replace(/\D/g, "")) : undefined,
                "Mountain Power": c.elements.MOUNTAIN_POWER ? Number(c.elements.MOUNTAIN_POWER.replace(/\D/g, "")) : undefined,
            };

            result[cardId] = newCard;
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

    const files = ["CORE_EN.json", "BISE_EN.json", "ALIZE_EN.json", "CYCLONE_EN.json"];

    // Exécution séquentielle
    for (let i = 0; i < files.length; i++) {
        const isLast = i === files.length - 1;
        await modifyJsonFile(files[i], outputFilePath, res, isLast);
    }
}

run();