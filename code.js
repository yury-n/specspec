const selection = figma.currentPage.selection[0];
const BG_PRIMARY = 'S:6523715b284e8f1d83aebadc7c8ce59bcf2137e2,2016:8';
const BG_SECONDARY = 'S:33d8ce3c082bb23d23e4256016944b2a293c074e,2016:7';
const TYPOGRAPHY_PRIMARY = 'S:d8ae12c0b0046098a0f214e0e5abf6495dea924e,7232:0';
const SPECS_SECTION_HEADER = 'S:dcc46e05405840a3e5e7627d29bce638b5da3deb,517:1';
const SPECS_SUBSECTION_HEADER = 'S:2f3f8d39705730528f2ba3c3f656186973d65d6a,314:1';
const H2 = 'S:990695a26044277bd473a8981665c904be540282,137:17';
const H6 = 'S:8a8333d410ae2a6b019efb9c0486716b8042fec5,137:14';
// auto-layout attributes
console.log('layoutAlign', selection['layoutAlign']);
console.log('layoutGrow', selection['layoutGrow']);
console.log('primaryAxisSizingMode', selection['primaryAxisSizingMode']);
console.log('counterAxisSizingMode', selection['counterAxisSizingMode']);
figma.showUI(__html__, { width: 300, height: 480 });
function supportsChildren(node) {
    console.log('!!!', node.type);
    return (node.type === 'FRAME' ||
        node.type === 'GROUP' ||
        node.type === 'COMPONENT' ||
        node.type === 'COMPONENT_SET' ||
        node.type === 'INSTANCE' ||
        node.type === 'BOOLEAN_OPERATION');
}
const propsAndTheirOptions = {
/* prop => [option1, option2] */
};
const variants = {
/* keyed by "Prop-Value" string */
};
let firstVariant;
if (selection && supportsChildren(selection)) {
    selection.children.forEach(child => {
        if (child.type === 'COMPONENT') {
            const pairs = child.name.split(', ');
            pairs.forEach(pair => {
                const [key, value] = pair.split('=');
                if (typeof propsAndTheirOptions[key] === 'undefined') {
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
    figma.ui.postMessage({
        propsAndTheirOptions,
    });
}
function getDSindex(name) {
    const matchResult = name.match(/^([0-9]+\.[0-9]+.*?)\s/);
    return matchResult && matchResult[1];
}
const renderSectionFrame = (title, child) => {
    const sectionFrame = createAutoFrame('VERTICAL', 10);
    const sectionHeader = figma.createText();
    sectionHeader.fillStyleId = TYPOGRAPHY_PRIMARY;
    sectionHeader.textStyleId = SPECS_SECTION_HEADER;
    sectionHeader.characters = title;
    sectionFrame.appendChild(sectionHeader);
    sectionFrame.appendChild(child);
    return sectionFrame;
};
const renderCombinationsFrame = (combinations, propsToExclude = [], excludePropsThatDontChange = false) => {
    let propsThatDontChange = Object.keys(combinations[0]);
    combinations.forEach((combination, index) => {
        if (index === 0) {
            return;
        }
        Object.keys(combination).forEach(prop => {
            if (combination[prop] !== combinations[0][prop]) {
                propsThatDontChange = propsThatDontChange.filter(p => p !== prop);
            }
        });
    });
    const combinationsFrame = createAutoFrame('HORIZONTAL', 30);
    combinations.forEach(combination => {
        const combinationFrame = createAutoFrame('VERTICAL', 20);
        const combinationHeader = figma.createText();
        combinationHeader.fillStyleId = TYPOGRAPHY_PRIMARY;
        combinationHeader.textStyleId = SPECS_SUBSECTION_HEADER;
        combinationHeader.characters = getTitleForCombination(combination, []
            .concat(propsToExclude)
            .concat(excludePropsThatDontChange ? propsThatDontChange : []));
        combinationFrame.appendChild(combinationHeader);
        const instanceForValue = firstVariant.createInstance();
        try {
            instanceForValue.setProperties(combination);
        }
        catch (e) {
            console.log('mmm', e);
        }
        combinationFrame.appendChild(instanceForValue);
        combinationsFrame.appendChild(combinationFrame);
    });
    return combinationsFrame;
};
const renderSpecs = (combinations, combinationsGrouped, initProps) => {
    const specsFrame = createAutoFrame('VERTICAL');
    specsFrame.fillStyleId = BG_PRIMARY;
    const headingFrame = figma.createFrame();
    headingFrame.layoutMode = 'HORIZONTAL';
    headingFrame.paddingTop = 100;
    headingFrame.paddingRight = 50;
    headingFrame.paddingBottom = 32;
    headingFrame.paddingLeft = 50;
    headingFrame.fillStyleId = BG_SECONDARY;
    headingFrame.layoutAlign = 'STRETCH';
    headingFrame.layoutGrow = 0;
    headingFrame.primaryAxisSizingMode = 'FIXED';
    headingFrame.counterAxisSizingMode = 'AUTO';
    const headingText = figma.createText();
    headingText.fillStyleId = TYPOGRAPHY_PRIMARY;
    headingText.fontName = { family: 'Menlo', style: 'Bold' };
    headingText.fontSize = 36;
    headingText.characters = selection.name;
    headingFrame.appendChild(headingText);
    specsFrame.appendChild(headingFrame);
    const bodyFrame = createAutoFrame('VERTICAL', 30);
    bodyFrame.fillStyleId = BG_PRIMARY;
    bodyFrame.paddingTop = 50;
    bodyFrame.paddingRight = 50;
    bodyFrame.paddingBottom = 50;
    bodyFrame.paddingLeft = 50;
    specsFrame.appendChild(bodyFrame);
    console.log({ propsAndTheirOptions });
    Object.keys(propsAndTheirOptions).forEach(prop => {
        const propOptionsFrame = createAutoFrame('HORIZONTAL', 30);
        propsAndTheirOptions[prop].forEach(option => {
            const optionFrame = createAutoFrame('VERTICAL', 20);
            const optionHeader = figma.createText();
            optionHeader.fillStyleId = TYPOGRAPHY_PRIMARY;
            optionHeader.fontName = { family: 'Menlo', style: 'Bold' };
            optionHeader.fontSize = 18;
            optionHeader.characters = option;
            optionFrame.appendChild(optionHeader);
            const instanceForValue = firstVariant.createInstance();
            try {
                const properties = initProps ? Object.assign({}, initProps) : {};
                properties[prop] = option;
                instanceForValue.setProperties(properties);
            }
            catch (e) {
                console.log('mmm', e);
            }
            optionFrame.appendChild(instanceForValue);
            propOptionsFrame.appendChild(optionFrame);
        });
        const propFrame = renderSectionFrame(prop, propOptionsFrame);
        bodyFrame.appendChild(propFrame);
    });
    if (Object.keys(combinationsGrouped).length) {
        Object.keys(combinationsGrouped).forEach(groupUnderString => {
            const propValuePairs = groupUnderString.split(', ');
            const propsGroupUnder = [];
            propValuePairs.forEach(propValue => {
                const [prop] = propValue.split(' = ');
                propsGroupUnder.push(prop);
            });
            const combinationsSectionFrame = renderSectionFrame(`Combinations [${groupUnderString}]`, renderCombinationsFrame(combinationsGrouped[groupUnderString], propsGroupUnder, true));
            bodyFrame.appendChild(combinationsSectionFrame);
        });
    }
    if (combinations.length) {
        const combinationsSectionFrame = renderSectionFrame('Combinations', renderCombinationsFrame(combinations));
        bodyFrame.appendChild(combinationsSectionFrame);
    }
    figma.currentPage.appendChild(specsFrame);
    specsFrame.x = selection.x;
    specsFrame.y = selection.y + selection.height + 100;
    figma.viewport.scrollAndZoomIntoView([specsFrame]);
};
const getTitleForCombination = (combination, propsToExclude) => {
    let title = '';
    Object.keys(combination).forEach(prop => {
        if (propsToExclude.includes(prop)) {
            return;
        }
        const propValue = combination[prop];
        const pairTitle = `${prop} = ${propValue}`;
        if (title === '') {
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
    frame.fillStyleId = BG_PRIMARY;
    frame.layoutAlign = 'INHERIT';
    frame.layoutGrow = 0;
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    return frame;
};
figma.ui.onmessage = msg => {
    if (msg.type === 'generate') {
        figma
            .loadFontAsync({ family: 'Roboto', style: 'Regular' })
            .then(() => figma.loadFontAsync({ family: 'Devious Sans', style: 'Bold' }))
            .then(() => figma.loadFontAsync({ family: 'Menlo', style: 'Bold' }))
            .then(() => figma.loadFontAsync({ family: 'Menlo', style: 'Regular' }))
            .then(() => figma.loadFontAsync({ family: 'Devious Sans', style: 'Bold' }))
            .then(() => renderSpecs(msg.combinations, msg.combinationsGrouped, msg.initProps));
    }
};
