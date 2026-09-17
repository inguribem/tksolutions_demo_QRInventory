import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error atrapado por ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-banner" style={{ margin: 24 }}>
          Ocurrió un error inesperado ({this.state.error.message || "sin detalle"}).
          <button
            className="link-button"
            style={{ marginLeft: 12 }}
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
