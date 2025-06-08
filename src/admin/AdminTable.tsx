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
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import supabaseClient from "../services/supabaseClient";

interface AdminTableProps {
  tableName: string;
  columns?: string[];
}

const AdminTable = ({ tableName, columns }: AdminTableProps) => {
  const [data, setData] = useState<any[]>([]);
  const [columnNames, setColumnNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      let orderField = "label";
      if (tableName === "restaurants") orderField = "name";
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

  if (loading) return <Spinner />;
  if (error) return <Text color="red.500">Erreur : {error}</Text>;
  if (data.length === 0)
    return (
      <Text color="gray.500">Aucune donnée dans la table "{tableName}"</Text>
    );

  const visibleColumns = columnNames.filter((col) => col !== "id");

  return (
    <Box borderWidth="1px" borderRadius="md" overflow="auto">
      <Table variant="striped" size="sm">
        <Thead
          position="sticky"
          top={0}
          zIndex={1}
          bg={useColorModeValue("gray.100", "gray.800")}
        >
          <Tr>
            {visibleColumns.map((col) => (
              <Th key={col}>{col}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.map((row, idx) => (
            <Tr key={idx}>
              {visibleColumns.map((col) => {
                const value = row[col];
                const isImage =
                  typeof value === "string" &&
                  (value.startsWith("http") || value.startsWith("/")) &&
                  col.toLowerCase().includes("image");

                return (
                  <Td key={col}>
                    {isImage ? (
                      <Image
                        src={value}
                        alt={col}
                        boxSize="40px"
                        objectFit="cover"
                        borderRadius="md"
                      />
                    ) : (
                      String(value)
                    )}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default AdminTable;
