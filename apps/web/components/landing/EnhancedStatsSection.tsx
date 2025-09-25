"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Shield, Star, Target, TrendingUp, Users } from "lucide-react";
import { brand } from "@/config/brand";

const EnhancedStatsSection = () => {
  const stats = [
    {
      icon: TrendingUp,
      value: "92%",
      label: "Success Rate",
      description: "Average signal accuracy",
      color: "accent-green",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Users,
      value: "5,000+",
      label: "VIP Members",
      description: "Active traders worldwide",
      color: "dc-accent",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: Shield,
      value: "24/7",
      label: "Support",
      description: "Expert assistance",
      color: "accent-teal",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: Star,
      value: "4.9",
      label: "Rating",
      description: "Member satisfaction",
      color: "accent-gold",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      icon: Target,
      value: "$2.5M+",
      label: "Profits",
      description: "Generated for members",
      color: "primary",
      gradient: "from-red-500 to-orange-600",
    },
    {
      icon: Award,
      value: "3+",
      label: "Years",
      description: "Proven track record",
      color: "dc-secondary",
      gradient: "from-blue-500 to-indigo-600",
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-background via-card/10 to-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-gradient-to-r from-primary/10 via-dc-accent/5 to-transparent rounded-full blur-3xl animate-pulse opacity-60" />
        <div
          className="absolute bottom-1/4 right-10 w-80 h-80 bg-gradient-to-l from-dc-accent/10 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse opacity-60"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-dc-accent bg-clip-text text-transparent">
            Proven Results That Speak
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light">
            Join thousands of successful traders who trust {brand.identity.name}
            {" "}
            for their trading success
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 sm:gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group"
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/30 hover:border-primary/40 transition-all duration-500 shadow-lg hover:shadow-xl">
                {/* Glow Effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />

                {/* Animated Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="relative p-5 sm:p-6 text-center">
                  <motion.div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg mb-4 group-hover:shadow-xl`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </motion.div>

                  <motion.div
                    className={`text-2xl md:text-3xl font-black text-[hsl(var(--${stat.color}))] mb-2 group-hover:scale-110 transition-transform font-mono`}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 10,
                      delay: index * 0.1 + 0.3,
                    }}
                    viewport={{ once: true }}
                  >
                    {stat.value}
                  </motion.div>

                  <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {stat.label}
                  </h4>

                  <p className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                    {stat.description}
                  </p>

                  {/* Achievement Badge */}
                  {stat.value.includes("%") && (
                    <Badge className="absolute top-2 right-2 bg-accent-green/20 text-accent-green text-xs">
                      High
                    </Badge>
                  )}

                  {stat.value.includes("+") && (
                    <Badge className="absolute top-2 right-2 bg-primary/20 text-primary text-xs">
                      Growing
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <p className="text-lg text-muted-foreground mb-6">
            Ready to join our successful trading community?
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto mx-auto"
          >
            <button
              type="button"
              className="w-full bg-gradient-to-r from-primary to-dc-accent text-white px-8 py-4 sm:px-10 sm:py-5 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              Start Your VIP Journey
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default EnhancedStatsSection;
