import { useEffect, useState } from "react";
import { DisasterEvent } from "@/lib/crisis/types";

const URL =
  "https://api.reliefweb.int/v1/disasters?appname=qualie-crisis" +
  "&filter[field]=country.iso3&filter[value]=IND" +
  "&limit=6&sort[]=date:desc" +
  "&fields[include][]=name&fields[include][]=date&fields[include][]=status";

export function useDisasterFeed() {
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(URL)
      .then((r) => r.json())
      .then((d) =>
        setEvents(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (d.data ?? []).map((x: any) => ({
            id: x.id,
            title: x.fields.name,
            date: x.fields.date?.created?.slice(0, 10) ?? "N/A",
            status: x.fields.status ?? "ongoing",
          }))
        )
      )
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading };
}
