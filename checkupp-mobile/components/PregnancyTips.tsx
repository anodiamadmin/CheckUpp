import React from "react";
import { View, Text, Dimensions, PixelRatio } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (width / 350) * size;
const verticalScale = (size: number) => (height / 680) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

// Device detection
const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

// Responsive spacing
const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.4);
  if (isSmallDevice) return verticalScale(size * 0.5);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.7);
};

const pregnancyTips: {
  range: [number, number];
  message: string;
  icon: string;
  babySize: string;
  trimester: number;
}[] = [
  // Early pregnancy: preparing and booking
  {
    range: [0, 4],
    message:
      "Your pregnancy journey begins! Start taking folic acid and iodine supplements daily. Book your first prenatal appointment and contact your hospital to arrange your 'booking in' visit for around 12-14 weeks. If you have pain or bleeding, contact your doctor or Early Pregnancy Assessment Clinic.",
    icon: "sprout",
    babySize: "Poppy seed",
    trimester: 1,
  },
  // Lifestyle, social and emotional wellbeing
  {
    range: [5, 7],
    message:
      "Your baby is the size of a sesame seed. Eat a balanced diet, and avoid smoking, alcohol, or other drugs. Talk to your GP about your support networks and emotional wellbeing. If you have a family history of hereditary or genetic conditions, let your care team know.",
    icon: "seed",
    babySize: "Sesame seed",
    trimester: 1,
  },
  // Early tests and screening
  {
    range: [8, 10],
    message:
      "Your baby is the size of a grape. Get your routine antenatal blood and urine tests. Check if your cervical screen is due. Discuss any current medical conditions or medications with your GP.",
    icon: "test-tube",
    babySize: "Grape",
    trimester: 1,
  },
  // First trimester screening & NIPT
  {
    range: [11, 13],
    message:
      "Your baby is growing rapidly! Now is the time for first trimester screening (cFTS) or non-invasive prenatal testing (NIPT) to assess for chromosomal conditions. Continue to monitor your nutrition and wellbeing.",
    icon: "flower",
    babySize: "Lime",
    trimester: 1,
  },
  // Hospital booking and influenza vaccine
  {
    range: [14, 16],
    message:
      "Your baby is as big as a lemon. Make sure you have attended your hospital 'booking in' visit. The influenza vaccine is recommended at any stage of pregnancy. Ask your GP or hospital.",
    icon: "hospital-box",
    babySize: "Lemon",
    trimester: 2,
  },
  // Morphology scan and parent education
  {
    range: [17, 21],
    message:
      "Your baby is as big as an avocado to a banana. Book your 18-20 week morphology scan to check your baby's growth and development. Consider signing up for parent education classes or a hospital tour.",
    icon: "fruit-bananas",
    babySize: "Banana",
    trimester: 2,
  },
  // Monitoring, exercise, pertussis vaccine
  {
    range: [22, 25],
    message:
      "Your baby is as big as a papaya. Keep active with safe exercise and continue routine antenatal visits. From 20-32 weeks, the whooping cough (pertussis) vaccine is recommended.",
    icon: "needle",
    babySize: "Papaya",
    trimester: 2,
  },
  // Gestational diabetes screening
  {
    range: [26, 29],
    message:
      "Your baby is as big as a cauliflower. It's time for your gestational diabetes screening (glucose tolerance test) between 26-29 weeks unless already diagnosed. If you are Rh negative, discuss management with your care team.",
    icon: "food-variant",
    babySize: "Cauliflower",
    trimester: 2,
  },
  // Third trimester checks and birth planning
  {
    range: [30, 33],
    message:
      "Your baby is the size of a cabbage. Continue regular checkups every 2 weeks. Start discussing your birth plan and preferences with your care team. Make sure you have hospital contact details ready.",
    icon: "leaf",
    babySize: "Cabbage",
    trimester: 3,
  },
  // GBS swab and breastfeeding preparation
  {
    range: [34, 36],
    message:
      "Your baby is as big as a honeydew melon. Around 35-37 weeks, your care team will do a swab for Group B Strep (GBS). Discuss any concerns about breastfeeding now so you can get support early.",
    icon: "bacteria",
    babySize: "Honeydew",
    trimester: 3,
  },
  // Late pregnancy monitoring & birth readiness
  {
    range: [37, 40],
    message:
      "Your baby is ready to meet you soon! Monitor your baby's movements and attend weekly antenatal visits. Have your hospital bag packed. If you haven't delivered by 41 weeks, your care team will advise on next steps.",
    icon: "baby-face-outline",
    babySize: "Watermelon",
    trimester: 3,
  },
  // Postnatal checks
  {
    range: [41, 42],
    message:
      "Congratulations! After birth, attend newborn checks at 2 and 6 weeks and your own check at 6 weeks. Discuss your emotional wellbeing and ask for support if you need it.",
    icon: "baby-carriage",
    babySize: "Newborn",
    trimester: 3,
  },
];

const getTrimesterInfo = (trimester: number) => {
  switch (trimester) {
    case 1:
      return {
        name: "First Trimester",
        colors: ["#FEF3C7", "#FBBF24"] as const,
        badgeColor: "bg-yellow-100",
        textColor: "text-yellow-800",
        iconColor: "#F59E0B",
      };
    case 2:
      return {
        name: "Second Trimester",
        colors: ["#DBEAFE", "#3B82F6"] as const,
        badgeColor: "bg-blue-100",
        textColor: "text-blue-800",
        iconColor: "#2563EB",
      };
    case 3:
      return {
        name: "Third Trimester",
        colors: ["#FCE7F3", "#EC4899"] as const,
        badgeColor: "bg-pink-100",
        textColor: "text-pink-800",
        iconColor: "#DB2777",
      };
    default:
      return {
        name: "Pregnancy Journey",
        colors: ["#F3E8FF", "#8B5CF6"] as const,
        badgeColor: "bg-purple-100",
        textColor: "text-purple-800",
        iconColor: "#7C3AED",
      };
  }
};

const getTipForWeek = (gestationalWeeks: number) => {
  const tip = pregnancyTips.find(
    (tip) =>
      gestationalWeeks >= tip.range[0] && gestationalWeeks <= tip.range[1]
  );
  return (
    tip || {
      message:
        "Your baby is growing! Follow your doctor's advice and take care of yourself.",
      icon: "baby-face",
      babySize: "Growing",
      trimester: 0,
    }
  );
};

const PregnancyTip = ({ gestationalWeeks }: { gestationalWeeks: number }) => {
  const tip = getTipForWeek(gestationalWeeks);
  const trimesterInfo = getTrimesterInfo(tip.trimester);

  return (
    <View
      className="bg-white rounded-xl border border-gray-100"
      style={{
        padding: scale(16),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      {/* Header */}
      <View
        className="flex-row items-center justify-between"
        style={{ marginBottom: getSpacing(12) }}
      >
        <View className="flex-row items-center flex-1">
          <View
            className="rounded-lg"
            style={{
              padding: scale(8),
              marginRight: scale(10),
              backgroundColor: `${trimesterInfo.iconColor}15`,
            }}
          >
            <MaterialCommunityIcons
              name="lightbulb-on"
              size={scale(18)}
              color={trimesterInfo.iconColor}
            />
          </View>
          <View className="flex-1">
            <Text
              className="font-psemibold text-black"
              style={{ fontSize: getFontSize(15) }}
            >
              Week {gestationalWeeks} Tip
            </Text>
            <View
              className="self-start rounded-full bg-gray-100"
              style={{
                paddingHorizontal: scale(8),
                paddingVertical: scale(3),
                marginTop: verticalScale(2),
              }}
            >
              <Text
                className="font-pmedium text-gray-600"
                style={{ fontSize: getFontSize(9) }}
              >
                {trimesterInfo.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Baby Size Indicator */}
        <View
          className="rounded-lg items-center"
          style={{
            padding: scale(8),
            backgroundColor: `${trimesterInfo.iconColor}15`,
          }}
        >
          <MaterialCommunityIcons
            name={tip.icon as any}
            size={scale(20)}
            color={trimesterInfo.iconColor}
          />
          <Text
            className="font-pmedium text-gray-600 mt-1"
            style={{ fontSize: getFontSize(8) }}
          >
            {tip.babySize}
          </Text>
        </View>
      </View>
      {/* Week Info */}
      <View
        className="bg-gray-50 rounded-lg"
        style={{
          padding: scale(12),
          marginBottom: getSpacing(12),
        }}
      >
        <Text
          className="text-gray-600 font-pmedium text-center"
          style={{
            fontSize: getFontSize(12),
            lineHeight: getFontSize(16),
          }}
        >
          At {gestationalWeeks} weeks, your baby is about the size of a{" "}
          <Text className="font-psemibold text-black">
            {tip.babySize.toLowerCase()}
          </Text>
        </Text>
      </View>

      {/* Main Tip Content */}
      <View className="bg-gray-50 rounded-lg" style={{ padding: scale(12) }}>
        <View
          className="flex-row items-center"
          style={{ marginBottom: getSpacing(8) }}
        >
          <MaterialCommunityIcons
            name="information"
            size={scale(14)}
            color={trimesterInfo.iconColor}
          />
          <Text
            className="font-psemibold text-black ml-2"
            style={{ fontSize: getFontSize(12) }}
          >
            What to Know This Week
          </Text>
        </View>

        <Text
          className="text-gray-600 font-pregular"
          style={{
            fontSize: getFontSize(11),
            lineHeight: getFontSize(15),
          }}
        >
          {tip.message}
        </Text>
      </View>

      {/* Progress Indicators */}
      <View
        className="flex-row items-center justify-between"
        style={{
          marginTop: getSpacing(12),
          paddingTop: getSpacing(12),
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
        }}
      >
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="calendar-week"
            size={scale(12)}
            color="#9CA3AF"
          />
          <Text
            className="text-gray-500 font-pmedium ml-1"
            style={{ fontSize: getFontSize(10) }}
          >
            Week {gestationalWeeks} of 40
          </Text>
        </View>

        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="chart-timeline-variant"
            size={scale(12)}
            color="#9CA3AF"
          />
          <Text
            className="text-gray-500 font-pmedium ml-1"
            style={{ fontSize: getFontSize(10) }}
          >
            {Math.round((gestationalWeeks / 40) * 100)}% Complete
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View
        className="bg-gray-100 rounded-full overflow-hidden"
        style={{
          height: scale(4),
          marginTop: getSpacing(8),
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.min((gestationalWeeks / 40) * 100, 100)}%`,
            backgroundColor: trimesterInfo.iconColor,
          }}
        />
      </View>
    </View>
  );
};
export default PregnancyTip;
