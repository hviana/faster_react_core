const FrameworkErrorPage = (props: any) => {
  return (
    <>
      <h1 className="react-error-page-title">Error</h1>
      <ul className="react-error-page-content">
        <li className="react-error-page-name">
          <strong>Message:</strong>
          <br />
          {(props as any).msg}
        </li>
        <li className="react-error-page-stack">
          <strong>Stack:</strong>
          <br />
          {(props as any).stack}
        </li>
      </ul>
      <style>
        {`body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f7;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            line-height: 1.6;
        }

        .react-page-wrapper {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            padding: 30px;
            text-align: left;
        }

        .react-error-page-title {
            color: #d9534f;
            font-size: 2.5em;
            margin-bottom: 20px;
            border-bottom: 2px solid #f2dede;
            padding-bottom: 10px;
        }
        .react-error-page-content {
            list-style-type: none;
            padding: 0;
        }
        .react-error-page-stack, .react-error-page-name {
            overflow: auto;
        }
        .react-error-page-name,
        .react-error-page-stack {
            background-color: #f2dede;
            border-left: 4px solid #d9534f;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 0 4px 4px 0;
        }

        .react-error-page-name strong,
        .react-error-page-stack strong {
            color: #a94442;
            display: block;
            margin-bottom: 10px;
        }

        .react-error-page-name br,
        .react-error-page-stack br {
            margin-bottom: 5px;
        }`}
      </style>
    </>
  );
};
export default FrameworkErrorPage;
