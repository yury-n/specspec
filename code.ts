let selection: SceneNode = null;
let generatedSpecIds = {};

let theme = "dark";
let specSheetShift = 0;

const themeColors = {
  dark: {
    BACKGROUND_PRIMARY: "S:6523715b284e8f1d83aebadc7c8ce59bcf2137e2,2016:8",
    BACKGROUND_SECONDARY: "S:33d8ce3c082bb23d23e4256016944b2a293c074e,2016:7",
    TYPOGRAPHY_PRIMARY: "S:d8ae12c0b0046098a0f214e0e5abf6495dea924e,7232:0",
    TYPOGRAPHY_TERTIARY: "S:19e831bbabd583dcc6206cf96d65c51327456336,1997:155",
  },
  light: {
    BACKGROUND_PRIMARY: "S:319dd5cf2a088cb8319f4a574b7a7ebab09cb14c,5347:0",
    BACKGROUND_SECONDARY: "S:3f97bc09911e343e57c30f2c9838f8f4bedb9c06,2016:14",
    TYPOGRAPHY_PRIMARY: "S:c36c9b72400242c94b98100aaca4225baea4f6e0,2578:0",
    TYPOGRAPHY_TERTIARY: "S:981900c8eb2f7c54311731d4413455017d45d462,2029:0",
  },
  green: {
    BACKGROUND_PRIMARY: "S:2140587b96f9f00ad127456b24d442381c1d743d,3851:1",
    BACKGROUND_SECONDARY: "S:ea9fa25647ae785b7d701824eff7ed16e2fa39b0,3851:0",
    TYPOGRAPHY_PRIMARY: "S:429c73a4d33ce785ed18f864bc84121824c5871f,2489:0",
    TYPOGRAPHY_TERTIARY: "S:7978eef7c566d8584d608261d21b5ba8bb5b3c98,5656:0",
  },
};

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
}

const DA_BG_PRIMARY = "S:6523715b284e8f1d83aebadc7c8ce59bcf2137e2,2016:8";
const DA_BG_SECONDARY = "S:33d8ce3c082bb23d23e4256016944b2a293c074e,2016:7";
const DA_BG_TERTIARY = "S:178f63c6996dd50473ef0de71903510f5f32b91b,2016:7";
const DA_TYPOGRAPHY_PRIMARY =
  "S:d8ae12c0b0046098a0f214e0e5abf6495dea924e,7232:0";

// auto-layout attributes
// console.log("selection", selection);
console.log("fillStyleId", selection["fillStyleId"]);
// console.log("layoutAlign", selection["layoutAlign"]);
// console.log("layoutGrow", selection["layoutGrow"]);
// console.log("primaryAxisSizingMode", selection["primaryAxisSizingMode"]);
// console.log("counterAxisSizingMode", selection["counterAxisSizingMode"]);

figma.showUI(__html__, { width: 300, height: 480 });

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
  specsFrame.fillStyleId = themeColors[theme]["BACKGROUND_PRIMARY"];
};

const setSpecsHeadingFrameStyles = (headingFrame) => {
  headingFrame.paddingTop = 100;
  headingFrame.paddingRight = 50;
  headingFrame.paddingBottom = 32;
  headingFrame.paddingLeft = 50;
  headingFrame.fillStyleId = themeColors[theme]["BACKGROUND_SECONDARY"];
  headingFrame.layoutAlign = "STRETCH";
};

const setSpecsHeadingTextStyles = (headingText) => {
  headingText.fillStyleId = themeColors[theme]["TYPOGRAPHY_PRIMARY"];
  headingText.fontName = { family: "Helvetica Neue", style: "Bold" };
  headingText.fontSize = 38;
};

const setSpecsSubHeadingTextStyles = (sectionHeader) => {
  sectionHeader.fillStyleId = themeColors[theme]["TYPOGRAPHY_TERTIARY"];
  sectionHeader.fontName = { family: "Helvetica Neue", style: "Bold" };
  sectionHeader.fontSize = 16;
};

const setSectionHeaderStyles = (sectionHeader) => {
  sectionHeader.fillStyleId = themeColors[theme]["TYPOGRAPHY_PRIMARY"];
  sectionHeader.fontName = { family: "Helvetica Neue", style: "Bold" };
  sectionHeader.fontSize = 24;
};

const setOptionHeaderStyles = (optionHeader) => {
  optionHeader.fillStyleId = themeColors[theme]["TYPOGRAPHY_PRIMARY"];
  optionHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
  optionHeader.fontSize = 18;
};

const setCombinationHeaderStyles = (combinationHeader) => {
  combinationHeader.fillStyleId = themeColors[theme]["TYPOGRAPHY_PRIMARY"];
  combinationHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
  combinationHeader.fontSize = 18;
};

const setBorderStyles = (borderRectangle) => {
  borderRectangle.fillStyleId = themeColors[theme]["TYPOGRAPHY_TERTIARY"];
};

const renderSpecs = (
  combinations,
  combinationsGrouped,
  withIndividualProps,
  initProps
) => {
  if (generatedSpecIds[theme]) {
    const previousSpec = figma.getNodeById(generatedSpecIds[theme]);
    previousSpec && previousSpec.remove();
  }
  const specsFrame = createAutoFrame("VERTICAL");
  setSpecsFrameStyles(specsFrame);

  const headingFrame = createAutoFrame("VERTICAL", 8);
  setSpecsHeadingFrameStyles(headingFrame);

  const headingText = figma.createText();
  setSpecsHeadingTextStyles(headingText);
  headingText.characters = selection.name;
  headingFrame.appendChild(headingText);

  if (selection["description"]) {
    const subheadingFrame = figma.createText();
    setSpecsSubHeadingTextStyles(subheadingFrame);
    subheadingFrame.characters = selection["description"];
    headingFrame.appendChild(subheadingFrame);
  }

  specsFrame.appendChild(headingFrame);

  const bodyFrame = createAutoFrame("VERTICAL", 60);
  bodyFrame.fills = [];
  bodyFrame.paddingTop = 60;
  bodyFrame.paddingRight = 50;
  bodyFrame.paddingBottom = 60;
  bodyFrame.paddingLeft = 50;
  generatedSpecIds[theme] = specsFrame.id;

  specsFrame.appendChild(bodyFrame);

  if (withIndividualProps) {
    Object.keys(propsAndTheirOptions).forEach((prop) => {
      const propOptionsFrame = createAutoFrame("HORIZONTAL", 30);
      propsAndTheirOptions[prop].forEach((option) => {
        const optionFrame = createAutoFrame("VERTICAL", 20);
        const optionHeader = figma.createText();
        setOptionHeaderStyles(optionHeader);
        optionHeader.characters = option;
        optionFrame.appendChild(optionHeader);
        const instanceForValue = firstVariant.createInstance();
        try {
          const properties = initProps ? Object.assign({}, initProps) : {};
          properties[prop] = option;
          instanceForValue.setProperties(properties);
        } catch (e) {}
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
  specsFrame.y = selection.y + selection.height + 100 + specSheetShift;
  figma.viewport.scrollAndZoomIntoView([specsFrame]);
  specSheetShift += specsFrame.height + 100;
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
      .then(() => {
        specSheetShift = 0;
        ["dark", "light", "green"].forEach((currentTheme) => {
          theme = currentTheme;
          renderSpecs(
            msg.combinations,
            msg.combinationsGrouped,
            msg.withIndividualProps,
            msg.initProps
          );
        });
      });
  } else if (msg.type === "set-theme") {
    theme = msg.theme;
    figma.clientStorage.setAsync("theme", msg.theme);
  }
};
