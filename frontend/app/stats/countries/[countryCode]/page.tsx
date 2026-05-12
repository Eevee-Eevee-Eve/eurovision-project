import { notFound } from "next/navigation";
import { CountryStatsDetail } from "../../../../components/CountryStatsDetail";
import { EUROVISION_COUNTRY_STATS } from "../../../../lib/eurovision-country-stats";
import { resolveCountryStatsParam } from "../../../../lib/country-stories";

export const dynamic = "force-dynamic";

export default function CountryStatsPage({ params }: { params: { countryCode: string } }) {
  const country = resolveCountryStatsParam(params.countryCode, EUROVISION_COUNTRY_STATS);

  if (!country) {
    notFound();
  }

  return <CountryStatsDetail country={country} />;
}
