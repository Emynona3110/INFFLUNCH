import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Text,
  Image,
  IconButton,
  useColorModeValue,
  Center,
  HStack,
  Link,
  Tag,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FaTrash, FaEdit } from "react-icons/fa";
import { BsBan } from "react-icons/bs";
import supabaseClient from "../services/supabaseClient";
import badgeMap from "../services/badgeMap";

interface AdminTableProps {
  tableName: string;
  columns?: string[];
  onEdit?: (data: any) => void;
  onDelete?: (id: number) => void;
}

const AdminTable = ({
  tableName,
  columns,
  onEdit,
  onDelete,
}: AdminTableProps) => {
  const bgHeader = useColorModeValue("gray.100", "gray.800");
  const rowBg = useColorModeValue("white", "gray.900");
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [data, setData] = useState<any[]>([]);
  const [columnNames, setColumnNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const isBadgeColumn = (col: string) =>
    col.toLowerCase() === "badges" || col.toLowerCase().includes("badge");

  const cleanUrlText = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      let orderField = "label";
      if (tableName === "restaurants") orderField = "slug";
      else if (tableName === "waiting_list") orderField = "email";

      const query = supabaseClient
        .from(tableName)
        .select(columns?.join(",") || "*")
        .order(orderField);

      const { data, error } = await query;

      if (error) {
        setError(error.message);
        setData([]);
      } else {
        setData(data ?? []);
        if (data && data.length > 0) {
          setColumnNames(columns ?? Object.keys(data[0]));
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [tableName, columns]);

  if (loading)
    return (
      <Center h="60vh">
        <Spinner size="xl" />
      </Center>
    );

  if (error)
    return (
      <Text color="red.500" textAlign="center">
        Erreur : {error}
      </Text>
    );

  if (data.length === 0)
    return (
      <Text color="gray.500" textAlign="center">
        Aucune donnée dans la table "{tableName}"
      </Text>
    );

  const visibleColumns =
    tableName === "restaurants" && isMobile
      ? ["name"]
      : columnNames.filter((col) => col !== "id");

  return (
    <Box borderWidth="1px" borderRadius="md" overflowX="auto">
      <Table variant="striped" size="sm">
        <Thead>
          <Tr>
            {visibleColumns.map((col) => (
              <Th
                key={col}
                textAlign="left"
                px={2}
                position="sticky"
                top={0}
                zIndex={4}
                bg={bgHeader}
              >
                {col}
              </Th>
            ))}
            <Th
              textAlign="right"
              px={2}
              position="sticky"
              top={0}
              right={0}
              zIndex={5}
              bg={bgHeader}
            >
              Actions
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((row, idx) => (
            <Tr key={idx} bg={rowBg}>
              {visibleColumns.map((col) => {
                const value = row[col];
                const isImage =
                  typeof value === "string" &&
                  (value.startsWith("http") || value.startsWith("/")) &&
                  col.toLowerCase().includes("image");
                const isWebsite =
                  typeof value === "string" &&
                  col.toLowerCase().includes("website");

                return (
                  <Td key={col} textAlign="left" px={2} bg={rowBg}>
                    {value === null || value === undefined || value === "" ? (
                      <BsBan />
                    ) : isImage ? (
                      <Image
                        src={value}
                        alt={col}
                        boxSize="40px"
                        objectFit="cover"
                        borderRadius="md"
                      />
                    ) : isWebsite ? (
                      <Link
                        href={value}
                        isExternal
                        color="blue.500"
                        textDecoration="underline"
                      >
                        {cleanUrlText(value)}
                      </Link>
                    ) : Array.isArray(value) &&
                      value.every((v) => typeof v === "string") ? (
                      isBadgeColumn(col) ? (
                        <HStack spacing={1}>
                          {value.map(
                            (badge: string) =>
                              badgeMap[badge] && (
                                <Image
                                  key={badge}
                                  src={badgeMap[badge]}
                                  boxSize="16px"
                                  objectFit="contain"
                                />
                              )
                          )}
                        </HStack>
                      ) : (
                        <HStack spacing={1}>
                          {value.map((tag: string, i: number) => (
                            <Tag key={i} size="sm" colorScheme="blue">
                              {tag}
                            </Tag>
                          ))}
                        </HStack>
                      )
                    ) : (
                      String(value)
                    )}
                  </Td>
                );
              })}
              <Td
                textAlign="right"
                px={2}
                position="sticky"
                right={0}
                zIndex={3}
                bg={rowBg}
              >
                <HStack justify="flex-end">
                  <IconButton
                    aria-label="Modifier"
                    icon={<FaEdit />}
                    size="sm"
                    onClick={() => onEdit?.(row)}
                  />
                  <IconButton
                    aria-label="Supprimer"
                    icon={<FaTrash />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => onDelete?.(row.id)}
                  />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default AdminTable;
