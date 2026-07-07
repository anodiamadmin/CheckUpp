import { Avatar } from "@dicebear/core";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SvgUri, SvgXml } from "react-native-svg";

const avataaars = require("@dicebear/styles/avataaars.json");

const DEFAULT_SEED = "checkupp-user";
const DICEBEAR_BACKGROUND_COLORS = [
  "#E0F2FE",
  "#DBEAFE",
  "#F5F3FF",
  "#FCE7F3",
  "#ECFCCB",
];
const FRIENDLY_EYEBROW_VARIANTS = [
  "default",
  "defaultNatural",
  "flatNatural",
  "raisedExcited",
  "raisedExcitedNatural",
  "upDown",
  "upDownNatural",
];
const HAPPY_EYE_VARIANTS = ["default", "happy", "squint", "wink"];
const HAPPY_MOUTH_VARIANTS = ["default", "smile", "twinkle"];
const FEMALE_TOP_VARIANTS = [
  "bigHair",
  "bob",
  "bun",
  "curly",
  "curvy",
  "frida",
  "longButNotTooLong",
  "miaWallace",
  "straight01",
  "straight02",
];
const MALE_TOP_VARIANTS = [
  "dreads",
  "dreads01",
  "dreads02",
  "shaggy",
  "shaggyMullet",
  "shavedSides",
  "shortCurly",
  "shortFlat",
  "shortRound",
  "shortWaved",
  "sides",
  "theCaesar",
  "theCaesarAndSidePart",
];

type UserAvatarGender = "male" | "female" | "prefer not to say";

interface GenderAvatarOptions {
  topVariant?: string[];
  facialHairProbability?: number;
  eyebrowsVariant?: string[];
  eyesVariant?: string[];
  mouthVariant?: string[];
}

export interface UserAvatarProps {
  seed?: string | null;
  imageUrl?: string | null;
  name?: string | null;
  gender?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const normalizeSeed = (value?: string | null) => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : DEFAULT_SEED;
};

const normalizeImageUrl = (value?: string | null) => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
};

const normalizeGender = (value?: string | null): UserAvatarGender | null => {
  const trimmedValue = value?.trim().toLowerCase();

  if (trimmedValue === "male") return "male";
  if (trimmedValue === "female") return "female";
  if (trimmedValue === "prefer not to say") return "prefer not to say";

  return null;
};

const buildGenderAvatarOptions = (
  gender: UserAvatarGender | null,
): GenderAvatarOptions => {
  if (gender === "female") {
    return {
      topVariant: FEMALE_TOP_VARIANTS,
      facialHairProbability: 0,
      eyebrowsVariant: FRIENDLY_EYEBROW_VARIANTS,
      eyesVariant: HAPPY_EYE_VARIANTS,
      mouthVariant: HAPPY_MOUTH_VARIANTS,
    };
  }

  if (gender === "male") {
    return {
      topVariant: MALE_TOP_VARIANTS,
      facialHairProbability: 30,
      eyebrowsVariant: FRIENDLY_EYEBROW_VARIANTS,
      eyesVariant: HAPPY_EYE_VARIANTS,
      mouthVariant: HAPPY_MOUTH_VARIANTS,
    };
  }

  return {
    eyebrowsVariant: FRIENDLY_EYEBROW_VARIANTS,
    eyesVariant: HAPPY_EYE_VARIANTS,
    mouthVariant: HAPPY_MOUTH_VARIANTS,
  };
};

const buildInitials = (value?: string | null) => {
  if (!value) return "CU";

  const normalizedValue = value.includes("@") ? value.split("@")[0] : value;
  const parts = normalizedValue
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return normalizedValue.slice(0, 2).toUpperCase() || "CU";
  }

  return parts
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const buildHttpSvgAvatarUrl = (
  seed: string,
  size: number,
  gender: UserAvatarGender | null,
) => {
  const backgroundColor = DICEBEAR_BACKGROUND_COLORS.map((color) =>
    color.replace("#", ""),
  ).join(",");
  const genderAvatarOptions = buildGenderAvatarOptions(gender);
  const queryParts = [
    `?seed=${encodeURIComponent(seed)}`,
    `&size=${encodeURIComponent(size.toString())}`,
    `&backgroundColor=${encodeURIComponent(backgroundColor)}`,
    `&backgroundColorFill=${encodeURIComponent("solid")}`,
    `&borderRadius=${encodeURIComponent("50")}`,
  ];

  if (genderAvatarOptions.topVariant?.length) {
    queryParts.push(
      `&topVariant=${encodeURIComponent(genderAvatarOptions.topVariant.join(","))}`,
    );
  }

  if (genderAvatarOptions.eyebrowsVariant?.length) {
    queryParts.push(
      `&eyebrowsVariant=${encodeURIComponent(
        genderAvatarOptions.eyebrowsVariant.join(","),
      )}`,
    );
  }

  if (genderAvatarOptions.eyesVariant?.length) {
    queryParts.push(
      `&eyesVariant=${encodeURIComponent(genderAvatarOptions.eyesVariant.join(","))}`,
    );
  }

  if (genderAvatarOptions.mouthVariant?.length) {
    queryParts.push(
      `&mouthVariant=${encodeURIComponent(genderAvatarOptions.mouthVariant.join(","))}`,
    );
  }

  if (typeof genderAvatarOptions.facialHairProbability === "number") {
    queryParts.push(
      `&facialHairProbability=${encodeURIComponent(
        genderAvatarOptions.facialHairProbability.toString(),
      )}`,
    );
  }

  return ["https://api.dicebear.com/10.x/avataaars/svg", ...queryParts].join(
    "",
  );
};

const buildSvgAvatar = (
  seed: string,
  size: number,
  name?: string | null,
  gender?: UserAvatarGender | null,
) => {
  try {
    const genderAvatarOptions = buildGenderAvatarOptions(gender ?? null);

    return new Avatar(avataaars, {
      seed,
      size,
      backgroundColor: DICEBEAR_BACKGROUND_COLORS,
      backgroundColorFill: "solid",
      borderRadius: 50,
      title: name ? `Avatar for ${name}` : undefined,
      ...genderAvatarOptions,
    }).toString();
  } catch (error) {
    console.warn("Failed to generate DiceBear SVG avatar", error);
    return null;
  }
};

const UserAvatar = ({
  seed,
  imageUrl,
  name,
  gender,
  size = 48,
  style,
}: UserAvatarProps) => {
  const normalizedSize = Math.max(1, Math.round(size));
  const normalizedImageUrl = useMemo(
    () => normalizeImageUrl(imageUrl),
    [imageUrl],
  );
  const normalizedGender = useMemo(() => normalizeGender(gender), [gender]);
  const resolvedSeed = useMemo(
    () => normalizeSeed(seed ?? name ?? normalizedImageUrl),
    [name, normalizedImageUrl, seed],
  );
  const svgAvatar = useMemo(
    () => buildSvgAvatar(resolvedSeed, normalizedSize, name, normalizedGender),
    [name, normalizedGender, normalizedSize, resolvedSeed],
  );
  const httpSvgAvatarUrl = useMemo(
    () => buildHttpSvgAvatarUrl(resolvedSeed, normalizedSize, normalizedGender),
    [normalizedGender, normalizedSize, resolvedSeed],
  );
  const initials = useMemo(
    () => buildInitials(name ?? resolvedSeed),
    [name, resolvedSeed],
  );
  const [svgFailed, setSvgFailed] = useState(false);
  const [httpSvgFailed, setHttpSvgFailed] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setSvgFailed(false);
    setHttpSvgFailed(false);
    setRemoteFailed(false);
  }, [httpSvgAvatarUrl, normalizedImageUrl, svgAvatar]);

  const containerStyle = [
    styles.container,
    {
      width: normalizedSize,
      height: normalizedSize,
      borderRadius: normalizedSize / 2,
    },
    style,
  ];

  const renderImage = (uri: string, onError?: () => void) => (
    <Image
      source={{ uri }}
      style={styles.fill}
      resizeMode="cover"
      onError={onError}
    />
  );

  const httpSvgFallback = !httpSvgFailed ? (
    <SvgUri
      uri={httpSvgAvatarUrl}
      width={normalizedSize}
      height={normalizedSize}
      onError={() => setHttpSvgFailed(true)}
      fallback={
        normalizedImageUrl && !remoteFailed
          ? renderImage(normalizedImageUrl, () => setRemoteFailed(true))
          : undefined
      }
    />
  ) : undefined;

  if (!svgFailed && svgAvatar) {
    return (
      <View style={containerStyle}>
        <SvgXml
          xml={svgAvatar}
          width={normalizedSize}
          height={normalizedSize}
          onError={() => setSvgFailed(true)}
          fallback={httpSvgFallback}
        />
      </View>
    );
  }

  if (!httpSvgFailed && httpSvgFallback) {
    return <View style={containerStyle}>{httpSvgFallback}</View>;
  }

  return (
    <View style={containerStyle}>
      {normalizedImageUrl && !remoteFailed ? (
        renderImage(normalizedImageUrl, () => setRemoteFailed(true))
      ) : (
        <View style={styles.initialsFallback}>
          <Text
            style={[
              styles.initialsText,
              { fontSize: Math.max(12, normalizedSize * 0.26) },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#FFF7ED",
  },
  fill: {
    width: "100%",
    height: "100%",
  },
  initialsFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
  },
  initialsText: {
    color: "#EA580C",
    fontWeight: "700",
  },
});

export default UserAvatar;
