import { useNavigate } from "react-router-dom";
import IntakeForm from "../components/IntakeForm";

export default function UploadCV() {
  const navigate = useNavigate();

  return (
    <div>
      <IntakeForm onComplete={() => navigate("/jobs")} />
    </div>
  );
}