import { Component } from "react";

export default class FrameworkErrorPage extends Component {
  override render() {
    return (
      <>
        <h1>Error</h1>
        <ul>
          <li>
            <strong>Error:</strong>
            {(this.props as any).msg}
          </li>
          <li>
            <strong>Stack:</strong>
            {(this.props as any).stack}
          </li>
        </ul>
      </>
    );
  }
}
