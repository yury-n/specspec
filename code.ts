let selection: SceneNode = null;
let generatedSpecId = null;

let theme = "dark";

const defaultConfig = {
  'theme.dark.header.background': '#161A1F',
  'theme.dark.header.fontColor': '#F8F8F8',
  'theme.dark.body.background': '#06070D',
  'theme.dark.body.fontColor': '#F8F8F8',
  'theme.light.header.background': '#FAFAFA',
  'theme.light.header.fontColor': '#0E0D20',
  'theme.light.body.background': '#EAEAEA',
  'theme.light.body.fontColor': '#0E0D20',
}

let config = defaultConfig;

const propsAndTheirOptions = {
  /* prop => [option1, option2] */
};
const variants = {
  /* keyed by "Prop-Value" string */
};

let firstVariant;

if (figma.currentPage.selection.length !== 1) {
  figma.closePlugin("Please select a component with variants");
} else {
  selection = figma.currentPage.selection[0];

  if (selection.type !== "COMPONENT_SET") {
    figma.closePlugin("Please select a component with variants");
  }

  // add Boolean props into propsAndTheirOptions
  const componentPropertyDefinitions =
    selection["componentPropertyDefinitions"];
  Object.keys(componentPropertyDefinitions).forEach((propName) => {
    const prop = componentPropertyDefinitions[propName];
    if (prop.type === "BOOLEAN") {
      propsAndTheirOptions[propName] = [true, false];
    }
  });
  // console.log({ propsAndTheirOptions });

  if (selection && supportsChildren(selection)) {
    selection.children.forEach((child) => {
      if (child.type === "COMPONENT") {
        const pairs = child.name.split(", ");
        pairs.forEach((pair) => {
          const [key, value] = pair.split("=");
          if (typeof propsAndTheirOptions[key] === "undefined") {
            propsAndTheirOptions[key] = [value];
          } else if (!propsAndTheirOptions[key].includes(value)) {
            propsAndTheirOptions[key].push(value);
          }
          if (!firstVariant) {
            firstVariant = child;
          }
          variants[`${key}-${value}`] = child;
        });
        // const childInstance = child.createInstance();
        // specsFrame.appendChild(childInstance);
      }
    });
    figma.clientStorage.getAsync("theme").then((themeFromStorage) => {
      figma.clientStorage.getAsync("config").then(configFromCS => {
        theme = themeFromStorage || "dark";
        config = configFromCS ? JSON.parse(configFromCS) : defaultConfig;
        figma.ui.postMessage({
          type: "render-ui",
          propsAndTheirOptions,
          theme,
          config,
        });
      });      
    });
  }
}

// auto-layout attributes
console.log("selection", selection);
// console.log(">>>", selection["description"]);
// if (selection.type === "COMPONENT_SET") {
//   // console.log(">>>", selection["componentPropertyDefinitions"]);
// }
// console.log("fills", selection["fills"]);
// console.log("layoutAlign", selection["layoutAlign"]);
// console.log("layoutGrow", selection["layoutGrow"]);
// console.log("primaryAxisSizingMode", selection["primaryAxisSizingMode"]);
// console.log("counterAxisSizingMode", selection["counterAxisSizingMode"]);

figma.showUI(__html__, { width: 300, height: 480 });

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function supportsChildren(
  node: SceneNode
): node is FrameNode | ComponentNode | InstanceNode | BooleanOperationNode {
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET" ||
    node.type === "INSTANCE" ||
    node.type === "BOOLEAN_OPERATION"
  );
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
  setBorderStyles(borderRectangle);

  const sectionHeader = figma.createText();
  setSectionHeaderStyles(sectionHeader);
  sectionHeader.characters = title;

  sectionHeaderFrame.appendChild(sectionHeader);
  sectionHeaderFrame.appendChild(borderRectangle);
  sectionHeaderFrame.layoutAlign = "STRETCH";

  sectionFrame.appendChild(sectionHeaderFrame);
  sectionFrame.appendChild(child);

  return sectionFrame;
};

const renderCombinationsFrame = (
  combinations,
  propsToExclude = [],
  excludePropsThatDontChange = false
) => {
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
    setCombinationHeaderStyles(combinationHeader);
    combinationHeader.characters = getTitleForCombination(
      combination,
      []
        .concat(propsToExclude)
        .concat(excludePropsThatDontChange ? propsThatDontChange : [])
    );
    combinationFrame.appendChild(combinationHeader);
    const instanceForValue = firstVariant.createInstance();
    try {
      instanceForValue.setProperties(combination);
    } catch (e) {}
    combinationFrame.appendChild(instanceForValue);
    combinationsFrame.appendChild(combinationFrame);
  });
  return combinationsFrame;
};

const setSpecsFrameStyles = (specsFrame) => {
  specsFrame.fills = [hexToFigmaColor(config[`theme.${theme}.body.background`])];
};

const setSpecsHeadingFrameStyles = (headingFrame) => {
  headingFrame.layoutMode = "HORIZONTAL";
  headingFrame.paddingTop = 100;
  headingFrame.paddingRight = 50;
  headingFrame.paddingBottom = 32;
  headingFrame.paddingLeft = 50;
  headingFrame.fills = [hexToFigmaColor(config[`theme.${theme}.header.background`])];
  headingFrame.layoutAlign = "STRETCH";
  headingFrame.layoutGrow = 0;
  headingFrame.primaryAxisSizingMode = "FIXED";
  headingFrame.counterAxisSizingMode = "AUTO";
};

const hexToFigmaColor = (hex) => ({type: 'SOLID', color: hexToDecimalRgb(hex)});

function hexToDecimalRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

const setSpecsHeadingTextStyles = (headingText) => {
  headingText.fills = [hexToFigmaColor(config[`theme.${theme}.header.fontColor`])];
  headingText.fontName = { family: "Helvetica Neue", style: "Bold" };
  headingText.fontSize = 38;
};

const setSectionHeaderStyles = (sectionHeader) => {
  sectionHeader.fills = [hexToFigmaColor(config[`theme.${theme}.body.fontColor`])];
  sectionHeader.fontName = { family: "Helvetica Neue", style: "Bold" };
  sectionHeader.fontSize = 24;
};

const setOptionHeaderStyles = (optionHeader) => {
  optionHeader.fills = [hexToFigmaColor(config[`theme.${theme}.body.fontColor`])];
  optionHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
  optionHeader.fontSize = 18;
};

const setCombinationHeaderStyles = (combinationHeader) => {
  combinationHeader.fills = [hexToFigmaColor(config[`theme.${theme}.body.fontColor`])];
  combinationHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
  combinationHeader.fontSize = 18;
};

const setBorderStyles = (borderRectangle) => {
  const dividerFill = Object.assign(
    { opacity: 0.25 },
    hexToFigmaColor(config[`theme.${theme}.body.fontColor`])
  );
  borderRectangle.fills = [dividerFill];
};

const renderSpecs = (
  combinations,
  combinationsGrouped,
  withIndividualProps,
  initProps
) => {
  if (generatedSpecId) {
    const previousSpec = figma.getNodeById(generatedSpecId);
    previousSpec && previousSpec.remove();
  }
  const specsFrame = createAutoFrame("VERTICAL");
  setSpecsFrameStyles(specsFrame);

  const headingFrame = figma.createFrame();
  setSpecsHeadingFrameStyles(headingFrame);

  const headingText = figma.createText();
  setSpecsHeadingTextStyles(headingText);
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
        setOptionHeaderStyles(optionHeader);
        optionHeader.characters = capitalizeFirstLetter(option.toString());
        optionFrame.appendChild(optionHeader);
        const instanceForValue = firstVariant.createInstance();
        try {
          const properties = initProps ? Object.assign({}, initProps) : {};
          properties[prop] = option;
          instanceForValue.setProperties(properties);
        } catch (e) {
          console.log({ e });
        }
        optionFrame.appendChild(instanceForValue);
        propOptionsFrame.appendChild(optionFrame);
      });

      const propFrame = renderSectionFrame(
        capitalizeFirstLetter(prop).split("#")[0], // cut off boolean prop hash index
        propOptionsFrame
      );
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
      const combinationsSectionFrame = renderSectionFrame(
        groupUnderString,
        renderCombinationsFrame(
          combinationsGrouped[groupUnderString],
          propsGroupUnder,
          true
        )
      );
      bodyFrame.appendChild(combinationsSectionFrame);
    });
  }

  if (combinations.length) {
    const combinationsSectionFrame = renderSectionFrame(
      "Combinations",
      renderCombinationsFrame(combinations)
    );
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
    } else {
      title += ` +\n${pairTitle}`;
    }
  });
  return title;
};

const createAutoFrame = (mode, itemSpacing?) => {
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
      .then(() =>
        figma.loadFontAsync({ family: "Helvetica Neue", style: "Medium" })
      )
      .then(() =>
        renderSpecs(
          msg.combinations,
          msg.combinationsGrouped,
          msg.withIndividualProps,
          msg.initProps
        )
      );
  } else if (msg.type === "set-theme") {
    theme = msg.theme;
    figma.clientStorage.setAsync("theme", msg.theme);
  } else if (msg.type === 'save-config') {
    config = msg.config || defaultConfig;
    figma.clientStorage.setAsync("config", msg.config ? JSON.stringify(msg.config) : undefined);
  }
};
