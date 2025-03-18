import * as React from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import type { IIfcViewerProps } from "./IIfcViewerProps";
import { FragmentsGroup } from "@thatopen/fragments";

BUI.Manager.init();

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "bim-button": any;
      "bim-checkbox": any;
      "bim-color-input": any;
      "bim-context-menu": any;
      "bim-dropdown": any;
      "bim-grid": any;
      "bim-icon": any;
      "bim-input": any;
      "bim-label": any;
      "bim-number-input": any;
      "bim-option": any;
      "bim-panel": any;
      "bim-panel-section": any;
      "bim-selector": any;
      "bim-table": any;
      "bim-tabs": any;
      "bim-tab": any;
      "bim-table-cell": any;
      "bim-table-children": any;
      "bim-table-group": any;
      "bim-table-row": any;
      "bim-text-input": any;
      "bim-toolbar": any;
      "bim-toolbar-group": any;
      "bim-toolbar-section": any;
      "bim-viewport": any;
    }
  }
}

export default class IfcViewer extends React.Component<IIfcViewerProps> {
  components = new OBC.Components();
  floatingGrid: BUI.Grid | undefined = undefined;
  updateClassificationsTree:
    | ((state?: {
        classifications: Array<string | { system: string; label: string }>;
      }) => void)
    | undefined = undefined;

  async componentDidMount() {
    await this.setViewer();
    this.setupUI();
  }

  async setViewer() {
    const worlds = this.components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBCF.PostproductionRenderer
    >();

    const sceneComponent = new OBC.SimpleScene(this.components);
    world.scene = sceneComponent;
    world.scene.setup();
    world.scene.three.background = null;

    const viewerContainer = document.getElementById(
      "viewer-container"
    ) as HTMLElement;
    const rendererComponent = new OBCF.PostproductionRenderer(
      this.components,
      viewerContainer
    );
    world.renderer = rendererComponent;

    const cameraComponent = new OBC.OrthoPerspectiveCamera(this.components);
    world.camera = cameraComponent;

    this.components.init();

    world.renderer.postproduction.enabled = true;
    await world.camera.controls.setLookAt(30, 30, 30, 0, 0, 0);
    world.camera.updateAspect();

    const ifcLoader = this.components.get(OBC.IfcLoader);
    await ifcLoader.setup();

    const highlighter = this.components.get(OBCF.Highlighter);
    highlighter.setup({ world });
    highlighter.zoomToSelection = true;

    viewerContainer.addEventListener("resize", () => {
      rendererComponent.resize();
      cameraComponent.updateAspect();
    });

    world.camera.controls.addEventListener("controlend", () => {});

    const fragmentsManager = this.components.get(OBC.FragmentsManager);
    fragmentsManager.onFragmentsLoaded.add(async (model) => {
      world.scene.three.add(model);
      await this.processModel(model);
    });
  }

  processModel = async (model: FragmentsGroup) => {
    if (!this.components) return;

    const indexer = this.components.get(OBC.IfcRelationsIndexer);
    await indexer.process(model);

    const classifier = this.components.get(OBC.Classifier);
    await classifier.bySpatialStructure(model);
    await classifier.byPredefinedType(model);
    classifier.byEntity(model);

    const classifications = [
      {
        system: "entities",
        label: "Entities",
      },
      {
        system: "spatialStructures",
        label: "Spatial Containers",
      },
      {
        system: "predefinedTypes",
        label: "Predefined Types",
      },
    ];

    if (this.updateClassificationsTree) {
      this.updateClassificationsTree({ classifications });
    }
  };

  setupUI = () => {
    const viewerContainer = document.getElementById("viewer-container");
    if (!viewerContainer) return;

    const floatingGrid = BUI.Component.create<BUI.Grid>(() => {
      return BUI.html`
        <bim-grid floating style="padding: 20px"></bim-grid>
      `;
    });

    const classificationsTreePanel = BUI.Component.create<BUI.Panel>(() => {
      const [classificationsTree, updateClassificationsTree] =
        CUI.tables.classificationTree({
          components: this.components,
          classifications: [],
        });

      this.updateClassificationsTree = updateClassificationsTree;

      return BUI.html`
        <bim-panel>
          <bim-panel-section
            name="classification"
            label="Classification Tree"
            icon="solar:document-bold"
            fixed
          >
            ${classificationsTree}
          </bim-panel-section>
        </bim-panel>
      `;
    });

    const elementPropertyPanel = BUI.Component.create<BUI.Panel>(() => {
      const [propsTable, updatePropsTable] = CUI.tables.elementProperties({
        components: this.components,
        fragmentIdMap: {},
      });
      const highlighter = this.components.get(OBCF.Highlighter);

      highlighter.events.select.onHighlight.add(async (fragmentIdMap) => {
        updatePropsTable({ fragmentIdMap });
        propsTable.expanded = false;
      });

      highlighter.events.select.onClear.add(() => {
        updatePropsTable({ fragmentIdMap: {} });

        if (!floatingGrid) return;
        setTimeout(() => {
          if (Object.keys(highlighter.selection.select).length === 0) {
            floatingGrid.layout = "main";
          }
        }, 50);
      });

      const search = (e: Event) => {
        const input = e.target as BUI.TextInput;
        propsTable.queryString = input.value;
      };

      return BUI.html`
        <bim-panel>
          <bim-panel-section
            name="property"
            label="Property Information"
            icon="solar:document-bold"
            fixed
          >
            <bim-text-input @input="${search}" placeholder="Search..."></bim-text-input>
            ${propsTable}
          </bim-panel-section>
        </bim-panel>
      `;
    });

    const onShowProperty = () => {
      if (!this.floatingGrid) return;

      if (this.floatingGrid.layout !== "second") {
        this.floatingGrid.layout = "second";
      } else {
        this.floatingGrid.layout = "main";
      }
    };

    const onShowClassification = () => {
      if (!this.floatingGrid) return;

      if (this.floatingGrid.layout !== "third") {
        this.floatingGrid.layout = "third";
      } else {
        this.floatingGrid.layout = "main";
      }
    };

    const toolbar = BUI.Component.create<BUI.Toolbar>(() => {
      const [loadIfcBtn] = CUI.buttons.loadIfc({ components: this.components });
      loadIfcBtn.tooltipTitle = "Load IFC";
      loadIfcBtn.label = "";

      return BUI.html`
        <bim-toolbar style="justify-self: center">
          <bim-toolbar-section>
            ${loadIfcBtn}
          </bim-toolbar-section>
          <bim-toolbar-section>
            <bim-button 
              tooltip-title="Properties" 
              icon="clarity:list-line"
              @click=${onShowProperty}
            ></bim-button>
            <bim-button 
              tooltip-title="Classification" 
              icon="clarity:tree-view-line"
              @click=${onShowClassification}
            ></bim-button>
            <bim-button 
              tooltip-title="Quantities" 
              icon="mdi:summation"
            ></bim-button>
          </bim-toolbar-section>
        </bim-toolbar>
      `;
    });

    floatingGrid.layouts = {
      main: {
        template: `
        "empty" 1fr
        "toolbar" auto
        /1fr
        `,
        elements: {
          toolbar,
        },
      },
      second: {
        template: `
        "empty elementPropertyPanel" 1fr
        "toolbar toolbar" auto
        /1fr 20rem
        `,
        elements: {
          toolbar,
          elementPropertyPanel,
        },
      },
      third: {
        template: `
        "empty classificationsTreePanel" 1fr
        "toolbar toolbar" auto
        /1fr 20rem
        `,
        elements: {
          toolbar,
          classificationsTreePanel,
        },
      },
    };

    floatingGrid.layout = "main";
    this.floatingGrid = floatingGrid;

    viewerContainer.appendChild(floatingGrid);
  };

  public render(): React.ReactElement<IIfcViewerProps> {
    return (
      <bim-viewport
        id="viewer-container"
        style={{
          width: "100%",
          height: "500px",
          position: "relative",
          background: "var(--background-200)",
          borderRadius: "8px",
        }}
      />
    );
  }
}
