"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { useRouter } from "next/navigation";

import { z } from "zod";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { useTranslations } from "next-intl";

import { api, getErrorMessage } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import type { LoginResponse } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const loginSchema = z.object({
    email: z
      .string()
      .min(1, t("emailRequired"))
      .email(t("invalidEmail")),

    password: z
      .string()
      .min(1, t("passwordRequired")),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const result = loginSchema.safeParse({
      email,
      password,
    });

    if (!result.success) {
      setError(
        result.error.issues[0]?.message ||
          tCommon("error"),
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await api.post<LoginResponse>(
          "/api/auth/login",
          {
            email,
            password,
          },
        );

      const data = response.data;

      saveAuth(data);

      router.replace("/dashboard");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("invalidCredentials"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f7fb",
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 5,
            borderRadius: 3,
          }}
        >
          <Stack spacing={3}>
            <Box
              sx={{
                textAlign: "center",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                }}
              >
                {t("loginTitle")}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                }}
              >
                {t("loginSubtitle")}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleLogin}
            >
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label={t("email")}
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label={t("password")}
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  disabled={loading}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(event) =>
                        setRememberMe(
                          event.target.checked,
                        )
                      }
                      disabled={loading}
                    />
                  }
                  label={t("rememberMe")}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    minHeight: 48,
                    fontWeight: 600,
                    textTransform: "none",
                  }}
                >
                  {loading ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : (
                    t("loginButton")
                  )}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
