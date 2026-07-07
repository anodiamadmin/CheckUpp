import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface EventItemProps {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const EventItem = ({
  id,
  title,
  startDate,
  endDate,
  notes,
}: EventItemProps) => {
  const hasDatePassed = new Date(endDate) < new Date();

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineColumn}>
        <View style={[styles.timelineDot, hasDatePassed && styles.checkedDot]}>
          {hasDatePassed && (
            <MaterialIcons name="check-circle" size={20} color="white" />
          )}
        </View>
        <View style={styles.separatorLine} />
      </View>
      <View style={styles.contentCard}>
        <Text style={styles.eventYear}>
          {new Date(startDate).getFullYear()}
        </Text>
        <Text style={styles.eventDescription}>{title}</Text>

        <View style={styles.detailContainer}>
          <MaterialIcons name="access-time" size={14} color="#666" />
          <Text style={styles.eventDate}>
            {new Date(startDate).toLocaleDateString()}
            {endDate && ` - ${new Date(endDate).toLocaleDateString()}`}
          </Text>
        </View>

        {notes && (
          <View style={styles.detailContainer}>
            <MaterialIcons name="notes" size={14} color="#666" />
            <Text style={styles.eventNotes} numberOfLines={2}>
              {notes}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timelineContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  timelineColumn: {
    alignItems: "center",
    marginRight: 10,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  checkedDot: {
    backgroundColor: "#4CAF50",
  },
  separatorLine: {
    width: 2,
    height: 60,
    backgroundColor: "#e0e0e0",
    marginTop: 4,
    borderRadius: 2,
  },
  contentCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventYear: {
    fontSize: 14,
    fontWeight: "600",
    color: "#757575",
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 17,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: "#616161",
    marginLeft: 6,
  },
  eventNotes: {
    fontSize: 14,
    color: "#616161",
    marginLeft: 6,
    lineHeight: 18,
  },
  detailContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
});

export default EventItem;
