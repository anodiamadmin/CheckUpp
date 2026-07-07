import {
  View,
  Text,
  Alert,
  Switch,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import {
  addDatesToCalendar,
  removeEventsFromCalendar,
} from "@/lib/notifications/calendar";
import {
  saveCancerScreeningData,
  deleteCancerScreeningData,
  fetchUserCancerScreeningData,
} from "@/lib/appwrite/appwrite";
import { format } from "date-fns";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/components/ToastProvider";
import CustomButton from "@/components/CustomButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { convertDateFormat, formatDate } from "@/lib/utils/dateFormatConverter";
import scheduleNotifications from "@/lib/notifications/scheduleNotifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { calculateScreeningDates } from "@/lib/utils/cancerScreeningChecks";
import React, { useState, useEffect } from "react";
import { cancelSelectedNotifications } from "@/lib/notifications/cancelAllNotifications";
import { getNotificationIdentifiersByTitles } from "@/lib/notifications/getNotifications";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export type Gender = "male" | "female" | "prefer not to say";

const CancerScreeningPage = () => {
  const { user } = useGlobalContext();

  const computeAge = (dob: string | undefined) => {
    if (!dob) return undefined;

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const [screeningDate, setScreeningDate] = useState<Date | undefined>(
    undefined,
  );
  const [age, setAge] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<Gender>(user?.gender || "male");
  const [screeningDates, setScreeningDates] = useState<
    { name: string; date: string; completed: boolean }[]
  >([]);
  const [neverScreened, setNeverScreened] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [showYearPicker, setShowYearPicker] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const data = await fetchUserCancerScreeningData(user?.$id);

      if (!user?.dob || !user?.gender) {
        router.push("/personal-details");

        showToast("Complete your profile to get accurate results.", "info");
      }

      const computedAge = computeAge(user?.dob);

      setAge(data?.[0]?.age || computedAge);
      setGender(data?.[0]?.gender || user?.gender || "male");

      if (data && data.length > 0) {
        const userData = data[0];

        if (!userData.lastScreeningDate) {
          setNeverScreened(true);
        } else {
          setScreeningDate(new Date(userData.lastScreeningDate));
        }

        const parsedScreeningDates = JSON.parse(
          userData.calculatedScreeningDates || "[]",
        );
        setScreeningDates(parsedScreeningDates);
      } else {
        setScreeningDates([]);
        setNeverScreened(false);
      }
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCalculate = () => {
    if (!age || isNaN(age)) {
      Alert.alert("Error", "Please enter a valid age.");
      return;
    }

    const baseDate = neverScreened ? new Date() : screeningDate;

    if (!baseDate) {
      Alert.alert(
        "Error",
        "Please select a date or indicate if you've never had a screening.",
      );
      return;
    }

    const calculatedDates = calculateScreeningDates(baseDate, age, gender);
    setScreeningDates(calculatedDates);
  };

  const toggleScreeningStatus = (index: number) => {
    setRefreshing(true);

    try {
      const updatedScreeningDates = screeningDates.map((item, i) => {
        if (i <= index && !screeningDates[index].completed) {
          return { ...item, completed: true };
        }

        if (i >= index && screeningDates[index].completed) {
          return { ...item, completed: false };
        }

        return item;
      });

      setScreeningDates(updatedScreeningDates);
    } catch (error: any) {
      showToast("Failed to toggle screening status.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !user.$id) {
      showToast("User information is missing", "error");
      return;
    }

    if (!age || !gender || (!neverScreened && !screeningDate)) {
      Alert.alert("Error", "Please complete the form before saving.");
      return;
    }

    let screeningDatesString;
    try {
      const screeningDatesObjects = screeningDates.map((item) => ({
        name: item.name,
        date: item.date,
        completed: item.completed,
      }));
      screeningDatesString = JSON.stringify(screeningDatesObjects);
    } catch (error) {
      showToast("Error processing screening dates", "error");
      return;
    }

    const data = {
      age,
      gender,
      calculatedScreeningDates: screeningDatesString,
      ...(neverScreened ? {} : { lastScreeningDate: screeningDate }),
      userId: user?.$id,
    };

    setIsUploading(true);

    try {
      await saveCancerScreeningData(data);

      const events = screeningDates.map((item) => ({
        title: item.name,
        date: convertDateFormat(item.date),
        description: `Your ${item.name} is scheduled for ${formatDate(
          item.date,
        )}. Remember to attend for timely health checks.`,
      }));

      await addDatesToCalendar(events);

      const notifications = screeningDates.flatMap((item) => {
        try {
          const formattedDate = convertDateFormat(item.date);
          const screeningDate = new Date(formattedDate);
          if (isNaN(screeningDate.getTime())) {
            throw new Error("Invalid date");
          }

          const oneMonthBefore = new Date(screeningDate);
          oneMonthBefore.setMonth(screeningDate.getMonth() - 1);

          return [
            {
              date: oneMonthBefore.toISOString(),
              title: `Upcoming Screening: ${item.name}`,
              body: `Don't forget! Your ${item.name} is scheduled for ${formattedDate}. Early detection is key to staying healthy. Mark your calendar!`,
            },
            {
              date: formattedDate,
              title: item.name,
              body: `Your ${item.name} is scheduled for this month. Please ensure you attend to keep your health in check.`,
            },
          ];
        } catch (error) {
          console.error("Error processing notification date:", error);
          return [];
        }
      });

      const eventsTitles = screeningDates.map((item) => item.name);
      const existingNotificationIdentifiers =
        await getNotificationIdentifiersByTitles(eventsTitles);

      if (existingNotificationIdentifiers.length > 0) {
        await cancelSelectedNotifications(existingNotificationIdentifiers);
      }

      await scheduleNotifications(notifications);

      showToast(
        "Cancer screening data saved successfully, and dates have been added to your calendar.",
        "success",
      );
    } catch (error: any) {
      showToast("Failed to save cancer screening data.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoBack = async () => {
    setLoading(true);

    router.back();

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
  };

  const handleClear = () => {
    Alert.alert("Clear Data", "Are you sure you want to clear the data?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Clear",
        onPress: async () => {
          setLoading(true);

          try {
            await deleteCancerScreeningData(user?.$id);

            setNeverScreened(false);
            setScreeningDate(undefined);
            setScreeningDates([]);

            const computedAge = computeAge(user?.dob);
            setAge(computedAge);
            setGender(user?.gender || "male");

            const eventsTitles = screeningDates.map((item) => item.name);

            await removeEventsFromCalendar(eventsTitles);

            const notificationIdentifiers =
              await getNotificationIdentifiersByTitles(eventsTitles);
            if (notificationIdentifiers.length > 0) {
              await cancelSelectedNotifications(notificationIdentifiers);
            }

            showToast("Data cleared successfully.", "success");
          } catch (error) {
            showToast("Failed to clear data. Please try again.", "error");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleYearChange = (selectedYear: string) => {
    const updatedDate = new Date();
    updatedDate.setFullYear(parseInt(selectedYear));
    updatedDate.setMonth(new Date().getMonth());
    updatedDate.setDate(new Date().getDate());
    setScreeningDate(updatedDate);
    setShowYearPicker(false);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-white">
        <LinearGradient
          colors={["#FFFAF5", "#FFF5EC"]}
          className="flex-row h-20 px-6 items-center shadow-md"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            onPress={handleGoBack}
            className="p-2 rounded-full bg-secondary/20"
          >
            <Ionicons name="chevron-back" size={20} color="#FF9C01" />
          </TouchableOpacity>
          <Text className="text-2xl font-psemibold text-gray-900 ml-4">
            Cancer Checks
          </Text>
        </LinearGradient>

        <ScrollView
          className="flex-1 px-4 py-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <Text className="text-base font-pregular text-gray-600 mb-4">
              Select your last screening date or indicate if you've never had a
              screening:
            </Text>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-base font-pmedium text-gray-600">
                Never had a screening:
              </Text>
              <Switch
                value={neverScreened}
                onValueChange={setNeverScreened}
                thumbColor={neverScreened ? "#FF9C01" : "#f4f4f5"}
                trackColor={{ true: "#FFEED9", false: "#f4f4f5" }}
              />
            </View>

            {!neverScreened && (
              <View className="mb-6">
                <Text className="text-base font-pmedium text-gray-600 mb-2">
                  Last Check-up
                </Text>
                {!showYearPicker ? (
                  <TouchableOpacity
                    onPress={() => setShowYearPicker(true)}
                    className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
                  >
                    <Text className="text-base font-pregular text-gray-900">
                      {screeningDate
                        ? format(screeningDate, "yyyy")
                        : "Select Year"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Picker
                    selectedValue={
                      screeningDate
                        ? screeningDate.getFullYear().toString()
                        : new Date().getFullYear().toString()
                    }
                    onValueChange={handleYearChange}
                  >
                    {Array.from(
                      { length: 120 },
                      (_, index) => new Date().getFullYear() - index,
                    ).map((year) => (
                      <Picker.Item
                        label={year.toString()}
                        value={year.toString()}
                        key={year}
                      />
                    ))}
                  </Picker>
                )}
              </View>
            )}

            {screeningDates.length === 0 && (
              <CustomButton
                title="Calculate Check-up Dates"
                handlePress={handleCalculate}
                containerStyles="bg-secondary"
                textStyles="text-black"
              />
            )}
          </View>

          {screeningDates.length > 0 && (
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-psemibold text-gray-900">
                  Checkup Schedule
                </Text>
                <View className="flex-row items-center bg-primary/10 px-3 py-1 rounded-full">
                  <Ionicons name="calendar" size={16} color="#FF9C01" />
                  <Text className="text-sm font-pmedium text-primary ml-1">
                    {screeningDates.filter((item) => item.completed).length}/
                    {screeningDates.length} Completed
                  </Text>
                </View>
              </View>

              <Text className="text-base font-pregular text-gray-500 mb-6">
                <Text className="font-psemibold">Note:</Text> Estimated dates -
                confirm with your healthcare provider.
              </Text>

              {screeningDates.map((item, index) => {
                const isCompleted = item.completed;
                const daysRemaining = Math.floor(
                  (new Date(item.date).getTime() - Date.now()) /
                    (1000 * 3600 * 24),
                );

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleScreeningStatus(index)}
                    className={`p-4 mb-3 rounded-xl border shadow-sm ${
                      isCompleted
                        ? "bg-green-50 border-green-100"
                        : "bg-white border-gray-100"
                    }`}
                    activeOpacity={0.9}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text
                            className={`text-base font-psemibold ${
                              isCompleted
                                ? "text-gray-400 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {item.name}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full mr-2">
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color="#64748b"
                            />
                            <Text className="text-sm font-pregular text-gray-600 ml-1">
                              {formatDate(item.date)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {isCompleted ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#22c55e"
                        />
                      ) : (
                        <View className="w-6 h-6 rounded-full border-2 border-gray-300" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View className="mt-6 space-y-3">
                <CustomButton
                  title={isUploading ? "Saving..." : "Save Schedule"}
                  handlePress={handleSave}
                  containerStyles="bg-primary"
                  textStyles="text-white"
                />

                <CustomButton
                  title="Clear All Data"
                  handlePress={handleClear}
                  containerStyles="bg-gray-50 border border-gray-200 mt-2"
                  textStyles="text-gray-700"
                />
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <LoadingSpinner visible={loading || isUploading} />
    </GestureHandlerRootView>
  );
};

export default CancerScreeningPage;
