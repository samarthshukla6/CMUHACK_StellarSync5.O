import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { getReportMarkdown, parseMarkdownSections } from "@/lib/report/format";
import type { TravelReport, StructuredReport } from "@/types";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Roboto", fontSize: 11, color: "#1e293b" },
  header: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
    color: "#2563EB",
    textAlign: "center",
  },
  subheader: { fontSize: 9, color: "#64748b", textAlign: "center", marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    marginTop: 10,
    color: "#1e40af",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
  },
  paragraph: { fontSize: 11, lineHeight: 1.5, marginBottom: 6 },
  listItem: { fontSize: 11, lineHeight: 1.4, marginBottom: 3, paddingLeft: 8 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function StructuredPdf({ structured }: { structured: StructuredReport }) {
  const {
    travelerInformation,
    destination,
    tripDetails,
    recommendedPlaces,
    itinerary,
    nextActions,
  } = structured;

  return (
    <>
      {Object.keys(travelerInformation).length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Traveler</Text>
          {Object.entries(travelerInformation).map(([key, value]) => (
            <Text key={key} style={styles.paragraph}>
              {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
            </Text>
          ))}
        </View>
      )}
      {destination && (
        <View>
          <Text style={styles.sectionTitle}>Destination</Text>
          <Text style={styles.paragraph}>{destination}</Text>
        </View>
      )}
      {tripDetails && (
        <View>
          <Text style={styles.sectionTitle}>Trip details</Text>
          <Text style={styles.paragraph}>{tripDetails}</Text>
        </View>
      )}
      {recommendedPlaces.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Recommended places</Text>
          {recommendedPlaces.map((item, i) => (
            <Text key={i} style={styles.listItem}>
              • {item}
            </Text>
          ))}
        </View>
      )}
      {itinerary && (
        <View>
          <Text style={styles.sectionTitle}>Itinerary</Text>
          <Text style={styles.paragraph}>{itinerary}</Text>
        </View>
      )}
      {nextActions.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Next actions</Text>
          {nextActions.map((step, i) => (
            <Text key={i} style={styles.listItem}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      )}
    </>
  );
}

export function TravelReportPdfDocument({ report }: { report: TravelReport }) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const markdown = getReportMarkdown(report);
  const sections = parseMarkdownSections(markdown);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Travel itinerary</Text>
        <Text style={styles.subheader}>Generated on {date} · Atlas</Text>

        {report.structured ? (
          <StructuredPdf structured={report.structured} />
        ) : (
          sections.map((section, i) => (
            <View key={i}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.body && <Text style={styles.paragraph}>{section.body}</Text>}
              {section.items?.map((item, j) => (
                <Text key={j} style={styles.listItem}>
                  • {item}
                </Text>
              ))}
            </View>
          ))
        )}

        <Text style={styles.footer}>
          Draft plan from your Atlas call. Confirm hours, tickets, and visas before you travel.
        </Text>
      </Page>
    </Document>
  );
}
