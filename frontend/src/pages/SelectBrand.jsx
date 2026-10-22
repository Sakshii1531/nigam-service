import { Navigate } from 'react-router-dom';

// Saved group links now open the direct partner-brand directory.
export default function SelectBrand() { return <Navigate to="/partner-warranty" replace />; }
