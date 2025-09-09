declare global {
  namespace React {
    namespace JSX {
      // Add three.js elements so TypeScript recognizes them in React 19 JSX
      interface IntrinsicElements {
        ambientLight: any;
        pointLight: any;
        mesh: any;
        boxGeometry: any;
        meshStandardMaterial: any;
      }
    }
  }
}

export {};
