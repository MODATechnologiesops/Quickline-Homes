import MarketerOnboard from "../../../components/MarketerOnboard";

export default function Page({ searchParams }) {
  return <MarketerOnboard invitationCode={searchParams?.invite || ""} />;
}
