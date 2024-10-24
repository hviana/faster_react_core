import { Component } from "react";

export default class FrameworkErrorPage extends Component {
  override render() {
    return (
      <>
        <h1 className="react-error-page-title">Error</h1>
        <ul className="react-error-page-content">
          <li className="react-error-page-name">
            <strong>Error:</strong>
            {(this.props as any).msg}
          </li>
          <li className="react-error-page-stack">
            <strong>Stack:</strong>
            {(this.props as any).stack}
          </li>
        </ul>
      </>
    );
  }
}
