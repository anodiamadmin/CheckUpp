import {
  Text,
  View,
  Alert,
  Switch,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import {
  saveNutritionData,
  fetchUserNutritionData,
  deleteNutritionData,
} from "@/lib/appwrite/appwrite";
import {
  addDatesToCalendar,
  removeEventsFromCalendar,
} from "@/lib/notifications/calendar";
import { format } from "date-fns";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/components/ToastProvider";
import CustomButton from "@/components/CustomButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import scheduleNotifications from "@/lib/notifications/scheduleNotifications";
import { calculateCheckupDates } from "@/lib/utils/nutritionChecks";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { cancelSelectedNotifications } from "@/lib/notifications/cancelAllNotifications";
import { convertDateFormat, formatDate } from "@/lib/utils/dateFormatConverter";
import { getNotificationIdentifiersByTitles } from "@/lib/notifications/getNotifications";
import { router } from "expo-router";

export type Gender = "male" | "female" | "prefer not to say";

const HealthAndNutritionCheckPage = () => {
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

  const [lastCheckUpDate, setLastCheckUpDate] = useState<Date | undefined>(
    undefined,
  );
  const [age, setAge] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<Gender>(user?.gender || "male");
  const [checkupDates, setCheckupDates] = useState<
    { name: string; date: string; completed: boolean }[]
  >([]);
  const [neverChecked, setNeverChecked] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [showYearPicker, setShowYearPicker] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const data = await fetchUserNutritionData(user?.$id);

      if (!user?.dob || !user?.gender) {
        router.push("/personal-details");

        showToast("Complete your profile to get accurate results.", "info");
      }

      const computedAge = computeAge(user?.dob);

      setAge(data?.[0]?.age || computedAge);
      setGender(data?.[0]?.gender || user?.gender || "male");

      if (data && data.length > 0) {
        const userData = data[0];

        if (!userData.lastCheckupDate) {
          setNeverChecked(true);
        } else {
          setLastCheckUpDate(new Date(userData.lastCheckupDate));
        }

        setLastCheckUpDate(
          userData.lastCheckupDate
            ? new Date(userData.lastCheckupDate)
            : undefined,
        );

        const parsedCheckupDates = JSON.parse(userData.checkupDates || "[]");
        setCheckupDates(parsedCheckupDates);
      } else {
        setLastCheckUpDate(undefined);
        setCheckupDates([]);
      }
    } catch (error) {
      showToast("Failed to fetch initial data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCalculate = () => {
    const baseDate = neverChecked ? new Date() : lastCheckUpDate;

    if (!baseDate || age === undefined) {
      Alert.alert("Error", "Please select a date and enter your age.");
      return;
    }

    const calculatedDates = calculateCheckupDates(baseDate, age);

    setCheckupDates(calculatedDates);
  };

  const toggleCheckupStatus = (index: number) => {
    setRefreshing(true);

    try {
      const updatedCheckupDates = checkupDates.map((item, i) => {
        if (i <= index && !checkupDates[index].completed) {
          return { ...item, completed: true };
        }

        if (i >= index && checkupDates[index].completed) {
          return { ...item, completed: false };
        }

        return item;
      });

      setCheckupDates(updatedCheckupDates);
    } catch (error) {
      showToast("Failed to update checkup status.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleYearChange = (selectedYear: string) => {
    const updatedDate = new Date();
    updatedDate.setFullYear(parseInt(selectedYear));
    updatedDate.setMonth(new Date().getMonth());
    updatedDate.setDate(new Date().getDate());
    setLastCheckUpDate(updatedDate);
    setShowYearPicker(false);
  };

  const handleSave = async () => {
    const checkupDatesObjects = checkupDates.map((item) => ({
      name: item.name,
      date: item.date,
      completed: item.completed,
    }));

    const checkupDatesString = JSON.stringify(checkupDatesObjects);
    const data = {
      ...(neverChecked ? {} : { lastScreeningDate: lastCheckUpDate }),
      checkupDates: checkupDatesString,
      age,
      gender,
      userId: user?.$id,
    };

    setIsUploading(true);

    try {
      await saveNutritionData(data);

      const events = checkupDates.map((item) => ({
        title: item.name,
        date: convertDateFormat(item.date),
        description: `Your ${item.name} checkup is scheduled for ${formatDate(
          item.date,
        )}. Make sure to attend and stay on top of your health.`,
      }));

      await addDatesToCalendar(events);

      const notifications = checkupDates.flatMap((item) => {
        const formattedDate = convertDateFormat(item.date);
        const checkupDate = new Date(formattedDate);
        const oneMonthBefore = new Date(checkupDate);
        oneMonthBefore.setMonth(checkupDate.getMonth() - 1);

        return [
          {
            date: oneMonthBefore.toISOString(),
            title: `Upcoming Checkup: ${item.name}`,
            body: `Your ${item.name} checkup is coming up on ${formattedDate}. Prioritize your health by preparing in advance. Set a reminder to stay on track!`,
          },
          {
            date: formattedDate,
            title: `Today's Checkup: ${item.name}`,
            body: `Your ${item.name} appointment is scheduled for this month. Make sure to attend and take charge of your well-being.`,
          },
        ];
      });

      const eventsTitles = checkupDates.map((item) => item.name);
      const existingNotificationIdentifiers =
        await getNotificationIdentifiersByTitles(eventsTitles);

      if (existingNotificationIdentifiers.length > 0) {
        await cancelSelectedNotifications(existingNotificationIdentifiers);
      }

      await scheduleNotifications(notifications);

      showToast(
        "Health and nutrition data has been saved, calendar dates have been added, and notifications rescheduled!",
        "success",
      );
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
  };

  const handleGoBack = async () => {
    setLoading(true);

    router.back();

    setLoading(false);
  };

  const handleClear = async () => {
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
            await deleteNutritionData(user.$id);

            const eventsTitles = checkupDates.map((item) => item.name);

            await removeEventsFromCalendar(eventsTitles);

            setNeverChecked(false);
            setLastCheckUpDate(undefined);
            setCheckupDates([]);

            const computedAge = computeAge(user?.dob);

            setAge(computedAge);
            setGender(user?.gender || "male");

            const notificationIdentifiers =
              await getNotificationIdentifiersByTitles(eventsTitles);
            if (notificationIdentifiers.length > 0) {
              await cancelSelectedNotifications(notificationIdentifiers);
            }

            showToast("Data has been cleared.", "success");
          } catch (error) {
            showToast("Failed to clear data. Please try again.", "error");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
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
            Health Checks
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
              Select your last checkup date to calculate upcoming health and
              nutrition check dates:
            </Text>

            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-base font-pmedium text-gray-600">
                Never had a check-up
              </Text>
              <Switch
                value={neverChecked}
                onValueChange={setNeverChecked}
                thumbColor={neverChecked ? "#FF9C01" : "#f4f4f5"}
                trackColor={{ true: "#FFEED9", false: "#f4f4f5" }}
              />
            </View>

            {!neverChecked && (
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
                      {lastCheckUpDate
                        ? format(lastCheckUpDate, "yyyy")
                        : "Select Year"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Picker
                    selectedValue={
                      lastCheckUpDate
                        ? lastCheckUpDate.getFullYear().toString()
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

            {checkupDates.length === 0 && (
              <CustomButton
                title="Calculate Check-up Dates"
                handlePress={handleCalculate}
                containerStyles="bg-secondary"
                textStyles="text-black"
              />
            )}
          </View>

          {checkupDates.length > 0 && (
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-psemibold text-gray-900">
                  Checkup Schedule
                </Text>
                <View className="flex-row items-center bg-primary/10 px-3 py-1 rounded-full">
                  <Ionicons name="calendar" size={16} color="#FF9C01" />
                  <Text className="text-sm font-pmedium text-primary ml-1">
                    {checkupDates.filter((item) => item.completed).length}/
                    {checkupDates.length} Completed
                  </Text>
                </View>
              </View>

              <Text className="text-base font-pregular text-gray-500 mb-6">
                <Text className="font-psemibold">Note:</Text> Estimated dates -
                confirm with your healthcare provider.
              </Text>

              {checkupDates.map((item, index) => {
                const isCompleted = item.completed;
                const daysRemaining = Math.floor(
                  (new Date(item.date).getTime() - Date.now()) /
                    (1000 * 3600 * 24),
                );

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleCheckupStatus(index)}
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

        <LoadingSpinner visible={loading || isUploading} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default HealthAndNutritionCheckPage;
