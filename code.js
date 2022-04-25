const DA_mode = false;
let generatedSpecId = null;
let theme = "dark";
const themeColors = {
    dark: {
        BACKGROUND_PRIMARY: {
            type: "SOLID",
            color: {
                r: 0.0235294122248888,
                g: 0.027450980618596077,
                b: 0.05098039284348488,
            },
            blendMode: "NORMAL",
            visible: true,
        },
        BACKGROUND_SECONDARY: {
            type: "SOLID",
            color: {
                r: 0.08627451211214066,
                g: 0.10196078568696976,
                b: 0.12156862765550613,
            },
            blendMode: "NORMAL",
            visible: true,
        },
        TYPOGRAPHY_FILL: {
            type: "SOLID",
            color: {
                r: 0.9725490212440491,
                g: 0.9725490212440491,
                b: 0.9725490212440491,
            },
            blendMode: "NORMAL",
            visible: true,
        },
    },
    light: {
        BACKGROUND_PRIMARY: {
            type: "SOLID",
            color: {
                r: 0.9176470637321472,
                g: 0.9176470637321472,
                b: 0.9176470637321472,
            },
            blendMode: "NORMAL",
            visible: true,
        },
        BACKGROUND_SECONDARY: {
            type: "SOLID",
            color: {
                r: 0.9803921580314636,
                g: 0.9803921580314636,
                b: 0.9803921580314636,
            },
            blendMode: "NORMAL",
            visible: true,
        },
        TYPOGRAPHY_FILL: {
            type: "SOLID",
            color: {
                r: 0.054901961237192154,
                g: 0.05098039284348488,
                b: 0.125490203499794,
            },
            blendMode: "NORMAL",
            visible: true,
        },
    },
};
const selection = figma.currentPage.selection[0];
const BG_PRIMARY = "S:6523715b284e8f1d83aebadc7c8ce59bcf2137e2,2016:8";
const BG_SECONDARY = "S:33d8ce3c082bb23d23e4256016944b2a293c074e,2016:7";
const TYPOGRAPHY_PRIMARY = "S:d8ae12c0b0046098a0f214e0e5abf6495dea924e,7232:0";
// auto-layout attributes
// console.log("selection", selection);
// console.log("fills", selection["fills"]);
// console.log("layoutAlign", selection["layoutAlign"]);
// console.log("layoutGrow", selection["layoutGrow"]);
// console.log("primaryAxisSizingMode", selection["primaryAxisSizingMode"]);
// console.log("counterAxisSizingMode", selection["counterAxisSizingMode"]);
figma.showUI(__html__, { width: 300, height: 480 });
function supportsChildren(node) {
    return (node.type === "FRAME" ||
        node.type === "GROUP" ||
        node.type === "COMPONENT" ||
        node.type === "COMPONENT_SET" ||
        node.type === "INSTANCE" ||
        node.type === "BOOLEAN_OPERATION");
}
const propsAndTheirOptions = {
/* prop => [option1, option2] */
};
const variants = {
/* keyed by "Prop-Value" string */
};
let firstVariant;
if (selection && supportsChildren(selection)) {
    selection.children.forEach((child) => {
        if (child.type === "COMPONENT") {
            const pairs = child.name.split(", ");
            pairs.forEach((pair) => {
                const [key, value] = pair.split("=");
                if (typeof propsAndTheirOptions[key] === "undefined") {
                    propsAndTheirOptions[key] = [value];
                }
                else if (!propsAndTheirOptions[key].includes(value)) {
                    propsAndTheirOptions[key].push(value);
                }
                firstVariant = child;
                variants[`${key}-${value}`] = child;
            });
            // const childInstance = child.createInstance();
            // specsFrame.appendChild(childInstance);
        }
    });
    figma.clientStorage.getAsync("theme").then((themeFromStorage) => {
        theme = themeFromStorage || "dark";
        figma.ui.postMessage({
            type: "render-ui",
            propsAndTheirOptions,
            theme,
        });
    });
}
function getDSindex(name) {
    const matchResult = name.match(/^([0-9]+\.[0-9]+.*?)\s/);
    return matchResult && matchResult[1];
}
const renderSectionFrame = (title, child) => {
    const sectionFrame = createAutoFrame("VERTICAL", 10);
    const sectionHeaderFrame = createAutoFrame("VERTICAL", 14);
    const borderRectangle = figma.createRectangle();
    borderRectangle.resizeWithoutConstraints(1, 1);
    borderRectangle.layoutAlign = "STRETCH";
    const dividerFill = Object.assign({ opacity: 0.25 }, themeColors[theme]["TYPOGRAPHY_FILL"]);
    borderRectangle.fills = [dividerFill];
    const sectionHeader = figma.createText();
    sectionHeader.fills = [themeColors[theme]["TYPOGRAPHY_FILL"]];
    sectionHeader.fontName = { family: "Helvetica Neue", style: "Bold" };
    sectionHeader.fontSize = 24;
    sectionHeader.characters = title;
    sectionHeaderFrame.appendChild(sectionHeader);
    sectionHeaderFrame.appendChild(borderRectangle);
    sectionHeaderFrame.layoutAlign = "STRETCH";
    sectionFrame.appendChild(sectionHeaderFrame);
    sectionFrame.appendChild(child);
    return sectionFrame;
};
const renderCombinationsFrame = (combinations, propsToExclude = [], excludePropsThatDontChange = false) => {
    let propsThatDontChange = Object.keys(combinations[0]);
    combinations.forEach((combination, index) => {
        if (index === 0) {
            return;
        }
        Object.keys(combination).forEach((prop) => {
            if (combination[prop] !== combinations[0][prop]) {
                propsThatDontChange = propsThatDontChange.filter((p) => p !== prop);
            }
        });
    });
    const combinationsFrame = createAutoFrame("HORIZONTAL", 60);
    combinations.forEach((combination) => {
        const combinationFrame = createAutoFrame("VERTICAL", 20);
        const combinationHeader = figma.createText();
        combinationHeader.fills = [themeColors[theme]["TYPOGRAPHY_FILL"]];
        combinationHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
        combinationHeader.fontSize = 18;
        combinationHeader.characters = getTitleForCombination(combination, []
            .concat(propsToExclude)
            .concat(excludePropsThatDontChange ? propsThatDontChange : []));
        combinationFrame.appendChild(combinationHeader);
        const instanceForValue = firstVariant.createInstance();
        try {
            instanceForValue.setProperties(combination);
        }
        catch (e) { }
        combinationFrame.appendChild(instanceForValue);
        combinationsFrame.appendChild(combinationFrame);
    });
    return combinationsFrame;
};
const renderSpecs = (combinations, combinationsGrouped, withIndividualProps, initProps) => {
    if (generatedSpecId) {
        const previousSpec = figma.getNodeById(generatedSpecId);
        previousSpec && previousSpec.remove();
    }
    const specsFrame = createAutoFrame("VERTICAL");
    specsFrame.fills = [themeColors[theme]["BACKGROUND_PRIMARY"]];
    const headingFrame = figma.createFrame();
    headingFrame.layoutMode = "HORIZONTAL";
    headingFrame.paddingTop = 100;
    headingFrame.paddingRight = 50;
    headingFrame.paddingBottom = 32;
    headingFrame.paddingLeft = 50;
    headingFrame.fills = [themeColors[theme]["BACKGROUND_SECONDARY"]];
    headingFrame.layoutAlign = "STRETCH";
    headingFrame.layoutGrow = 0;
    headingFrame.primaryAxisSizingMode = "FIXED";
    headingFrame.counterAxisSizingMode = "AUTO";
    const headingText = figma.createText();
    headingText.fills = [themeColors[theme]["TYPOGRAPHY_FILL"]];
    headingText.fontName = { family: "Helvetica Neue", style: "Bold" };
    headingText.fontSize = 38;
    headingText.characters = selection.name;
    headingFrame.appendChild(headingText);
    specsFrame.appendChild(headingFrame);
    const bodyFrame = createAutoFrame("VERTICAL", 60);
    bodyFrame.fills = [];
    bodyFrame.paddingTop = 60;
    bodyFrame.paddingRight = 50;
    bodyFrame.paddingBottom = 60;
    bodyFrame.paddingLeft = 50;
    generatedSpecId = specsFrame.id;
    specsFrame.appendChild(bodyFrame);
    if (withIndividualProps) {
        Object.keys(propsAndTheirOptions).forEach((prop) => {
            const propOptionsFrame = createAutoFrame("HORIZONTAL", 30);
            propsAndTheirOptions[prop].forEach((option) => {
                const optionFrame = createAutoFrame("VERTICAL", 20);
                const optionHeader = figma.createText();
                optionHeader.fills = [themeColors[theme]["TYPOGRAPHY_FILL"]];
                optionHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
                optionHeader.fontSize = 18;
                optionHeader.characters = option;
                optionFrame.appendChild(optionHeader);
                const instanceForValue = firstVariant.createInstance();
                try {
                    const properties = initProps ? Object.assign({}, initProps) : {};
                    properties[prop] = option;
                    instanceForValue.setProperties(properties);
                }
                catch (e) { }
                optionFrame.appendChild(instanceForValue);
                propOptionsFrame.appendChild(optionFrame);
            });
            const propFrame = renderSectionFrame(prop, propOptionsFrame);
            bodyFrame.appendChild(propFrame);
        });
    }
    if (Object.keys(combinationsGrouped).length) {
        Object.keys(combinationsGrouped).forEach((groupUnderString) => {
            const propValuePairs = groupUnderString.split(", ");
            const propsGroupUnder = [];
            propValuePairs.forEach((propValue) => {
                const [prop] = propValue.split(" = ");
                propsGroupUnder.push(prop);
            });
            const combinationsSectionFrame = renderSectionFrame(groupUnderString, renderCombinationsFrame(combinationsGrouped[groupUnderString], propsGroupUnder, true));
            bodyFrame.appendChild(combinationsSectionFrame);
        });
    }
    if (combinations.length) {
        const combinationsSectionFrame = renderSectionFrame("Combinations", renderCombinationsFrame(combinations));
        bodyFrame.appendChild(combinationsSectionFrame);
    }
    figma.currentPage.appendChild(specsFrame);
    specsFrame.x = selection.x;
    specsFrame.y = selection.y + selection.height + 100;
    figma.viewport.scrollAndZoomIntoView([specsFrame]);
};
const getTitleForCombination = (combination, propsToExclude) => {
    let title = "";
    Object.keys(combination).forEach((prop) => {
        if (propsToExclude.includes(prop)) {
            return;
        }
        const propValue = combination[prop];
        const pairTitle = `${prop} = ${propValue}`;
        if (title === "") {
            title = pairTitle;
        }
        else {
            title += ` +\n${pairTitle}`;
        }
    });
    return title;
};
const createAutoFrame = (mode, itemSpacing) => {
    const frame = figma.createFrame();
    frame.layoutMode = mode;
    if (itemSpacing) {
        frame.itemSpacing = itemSpacing;
    }
    frame.fills = [];
    frame.layoutAlign = "INHERIT";
    frame.layoutGrow = 0;
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    return frame;
};
figma.ui.onmessage = (msg) => {
    if (msg.type === "generate") {
        figma
            .loadFontAsync({ family: "Helvetica Neue", style: "Bold" })
            .then(() => figma.loadFontAsync({ family: "Helvetica Neue", style: "Medium" }))
            .then(() => renderSpecs(msg.combinations, msg.combinationsGrouped, msg.withIndividualProps, msg.initProps));
    }
    else if (msg.type === "set-theme") {
        theme = msg.theme;
        figma.clientStorage.setAsync("theme", msg.theme);
    }
};
