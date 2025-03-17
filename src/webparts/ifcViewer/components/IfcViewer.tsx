import * as React from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
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
    this.loadModelCheck();
  }

  setViewer() {
    const components = new OBC.Components();

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBCF.PostproductionRenderer
    >();

    const sceneComponent = new OBC.SimpleScene(components);
    world.scene = sceneComponent;
    world.scene.setup();
    world.scene.three.background = null;

    const viewerContainer = document.getElementById(
      "viewer-container"
    ) as HTMLElement;
    const rendererComponent = new OBCF.PostproductionRenderer(
      components,
      viewerContainer
    );
    world.renderer = rendererComponent;

    const cameraComponent = new OBC.OrthoPerspectiveCamera(components);
    world.camera = cameraComponent;

    components.init();

    world.renderer.postproduction.enabled = true;
    world.camera.controls.setLookAt(30, 30, 30, 0, 0, 0);
    world.camera.updateAspect();

    const ifcLoader = components.get(OBC.IfcLoader);
    ifcLoader.setup();

    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ world });
    highlighter.zoomToSelection = true;

    viewerContainer.addEventListener("resize", () => {
      rendererComponent.resize();
      cameraComponent.updateAspect();
    });

    world.camera.controls.addEventListener("controlend", () => {});

    const fragmentsManager = components.get(OBC.FragmentsManager);
    fragmentsManager.onFragmentsLoaded.add(async (model) => {
      world.scene.three.add(model);
    });
  }

  async loadModelCheck() {
    const components = new OBC.Components();

    const file = await fetch("./assets/UrbanLoft.frag");
    const data = await file.arrayBuffer();
    const fragmentBinary = new Uint8Array(data);
    const fragmentsManager = components.get(OBC.FragmentsManager);
    const model = await fragmentsManager.load(fragmentBinary);

    const propsRoute = "./assets/UrbanLoft.json";
    const jsonProperties = await fetch(propsRoute);
    const properties = await jsonProperties.json();

    model.setLocalProperties(properties);
  }

  public render(): React.ReactElement<IIfcViewerProps> {
    return (
      <bim-viewport
        id="viewer-container"
        style={{
          minWidth: 0,
          position: "relative",
          maxHeight: "calc(100vh - 100px)",
          background: "var(--background-200)",
          borderRadius: "8px",
        }}
      />
    );
  }
}
