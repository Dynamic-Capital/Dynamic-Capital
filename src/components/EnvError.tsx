import React from "react";

const EnvError = ({ message }: { message: string }) => (
  <div className="p-4 text-center text-red-600">
    <h1 className="text-xl font-bold mb-2">Configuration Error</h1>
    <p>{message}</p>
  </div>
);

export default EnvError;
