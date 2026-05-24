/**
 * Onboarding Screen — F6.2
 *
 * 3-card walkthrough shown on first launch.
 * - Swipeable cards with pagination dots
 * - Skip / Next / Get Started buttons
 * - Persists "seen" flag in AsyncStorage
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";

const { width } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: "1",
    icon: "globe",
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    title: "Discover Global Jobs",
    subtitle: "Your gateway to international careers",
    description:
      "Browse verified overseas job opportunities across Australia, Canada, UAE, UK, and more — all through the official HPSEDC placement portal.",
  },
  {
    id: "2",
    icon: "shield-checkmark",
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
    title: "Safe & Verified",
    subtitle: "Government-backed recruitment",
    description:
      "Every employer and agency on HireStream is verified by HPSEDC. Your documents, applications, and personal data are protected with enterprise-grade security.",
  },
  {
    id: "3",
    icon: "rocket",
    iconBg: "#faf5ff",
    iconColor: "#7c3aed",
    title: "Apply in One Tap",
    subtitle: "Track your journey end-to-end",
    description:
      "Apply to jobs instantly, track your application status in real-time, upload documents, and get notified at every stage — all from your phone.",
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width }]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={64} color={item.iconColor} />
      </View>

      {/* Content */}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: i === currentIndex ? colors.primary : colors.textTertiary,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnLast]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {isLast ? (
            <>
              <Text style={styles.nextBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </>
          ) : (
            <>
              <Text style={styles.nextBtnText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>

        {/* Footer branding */}
        <Text style={styles.footerText}>
          A Government of Himachal Pradesh initiative
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    right: spacing.xl,
    zIndex: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl + spacing.lg,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: Platform.OS === "ios" ? 40 : spacing.xxl,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    width: "100%",
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextBtnLast: {
    backgroundColor: "#16a34a",
    shadowColor: "#16a34a",
  },
  nextBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },
});
