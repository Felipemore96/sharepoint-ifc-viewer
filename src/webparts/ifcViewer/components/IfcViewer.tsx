import * as React from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import type { IIfcViewerProps } from "./IIfcViewerProps";

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
  componentDidMount() {
    this.setViewer();
    this.setupUI();
  }
  components = new OBC.Components();

  setViewer() {
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
    world.camera.controls.setLookAt(30, 30, 30, 0, 0, 0);
    world.camera.updateAspect();

    const ifcLoader = this.components.get(OBC.IfcLoader);
    ifcLoader.setup();

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
    });
  }

  setupUI = () => {
    const viewerContainer = document.getElementById("viewer-container");
    if (!viewerContainer) {
      console.log("Viewer container not found");
      return;
    }

    const floatingGrid = BUI.Component.create<BUI.Grid>(() => {
      return BUI.html`
        <bim-grid floating style="padding: 20px"></bim-grid>
      `;
    });

    const toolbar = BUI.Component.create<BUI.Toolbar>(() => {
      const [loadIfcBtn] = CUI.buttons.loadIfc({ components: this.components });
      loadIfcBtn.tooltipTitle = "Load IFC";
      loadIfcBtn.label = "";

      return BUI.html`
        <bim-toolbar style="justify-self: center">
          <bim-toolbar-section label="Import">
              ${loadIfcBtn}
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
      dispose: {
        template: `
        "empty" 1fr
        "empty" auto
        /1fr
        `,
        elements: {},
      },
    };

    floatingGrid.layout = "main";

    viewerContainer.appendChild(floatingGrid);
  };

  public render(): React.ReactElement<IIfcViewerProps> {
    return (
      <bim-viewport
        id="viewer-container"
        style={{
          width: "100%",
          height: "500px", // Set a fixed height for testing
          position: "relative",
          background: "var(--background-200)",
          borderRadius: "8px",
        }}
      />
    );
  }
}
